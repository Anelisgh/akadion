# Task pentru agent AI: Persistență istoric conversații Aky (chatbot RAG)

## Context proiect

Lucrezi pe backend-ul **Akadion** — monolit Spring Boot 3 / Java 21, arhitectură stratificată (`controller` / `service` / `repository` / `entity` / `security` / `config`), PostgreSQL, Flyway pentru migrații, integrare Keycloak (BFF pattern), MinIO pentru fișiere, și un serviciu extern RAG (FastAPI) apelat prin `RestClient` pentru chatbot-ul "Aky".

Toate entitățile de business extind `BaseAuditableEntity` (`createdBy`, `createdAt`, `updatedBy`, `updatedAt`, populate automat din `SecurityContext` via `AuditConfig`). IDs interne sunt `BIGINT`/`Long` (nu se propagă `id_keycloak` ca FK în afara `app_user`). Excepțiile custom sunt centralizate în `GlobalExceptionHandler` (`@RestControllerAdvice`) — vezi catalogul complet mai jos, **reutilizează excepțiile existente, nu crea altele noi decât dacă e strict necesar**.

## Ce există deja și NU trebuie modificat

- Contractul cu serviciul RAG (`POST /ingest`, `DELETE /ingest/{id}`, `POST /chat`) — payload-ul trimis către `/chat` rămâne **identic**: `{studentId, cursId, intrebare, istoricConversatie}`. Nu schimbi formatul, doar sursa datelor din care se construiește `istoricConversatie` (până acum venea din React state, de acum vine din DB).
- `RagChatService` (client HTTP către `/chat`) — rămâne funcțional cum e, doar consumat diferit.
- Toate entitățile existente (`User`, `Curs`, `Saptamana`, `Document`, `UserCurs`, `Parcurs`) — nu le modifici, doar adaugi entități noi care le referențiază.

## Obiectiv

Adaugă persistență completă pentru conversațiile studenților **și ale profesorilor** cu asistentul Aky, cu următorul model de business:

1. **Sesiuni multiple** — un utilizator poate porni oricâte conversații separate pe același curs (nu un singur fir continuu). Fiecare conversație are un titlu generat automat din primul mesaj.
2. **Acces dual, nu doar studenți** — atât studentul înrolat activ, cât și profesorul deținător al cursului pot conversa cu Aky despre acel curs. Adminii nu folosesc chatbot-ul.
3. **Ownership persistent la citire, restrictiv la scriere:**
   - **Citire** istoric conversație: permisă cât timp userul e owner-ul conversației (student, chiar dacă între timp s-a dezînscris de la curs, SAU profesor, chiar dacă între timp cursul a fost dezactivat).
   - **Scriere** (mesaj nou): permisă doar dacă studentul e încă înrolat activ (`UserCurs.activ=true`) SAU profesorul e încă deținătorul cursului (`Curs.profesor.id == user.id`).
4. **Ștergere conversație** — soft-delete la nivel de conversație întreagă (nu per-mesaj individual). Studentul/profesorul își poate șterge propriile conversații.
5. **Istoric trimis la RAG** — backend-ul preia ultimele 10 mesaje din DB (nu mai vine trunchiat din frontend) și le mapează la formatul `istoricConversatie` cerut de contractul RAG existent.

## Pas 0 — Verificare obligatorie înainte de orice migrație

Există deja o **coliziune de numerotare Flyway V2** între planurile de migrație "profesor" și "student" (issue cunoscut, nerezolvat). Înainte de a crea orice fișier de migrație nou:
1. Listează efectiv fișierele din `db/migration/` din repo.
2. Determină următorul număr de versiune liber real (nu presupune V3/V4 — verifică).
3. Dacă găsești coliziunea V2 nerezolvată, semnalează-o explicit înainte de a continua — nu o rezolva tu unilateral fără context, doar raportează ce ai găsit.

## Schema DB (adaptează numerotarea Flyway conform Pasului 0)

```sql
CREATE TABLE conversatii (
    id BIGSERIAL PRIMARY KEY,
    id_user BIGINT NOT NULL REFERENCES app_user(id),
    id_curs BIGINT NOT NULL REFERENCES cursuri(id),
    titlu VARCHAR(150),
    activ BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(36),
    updated_at TIMESTAMPTZ
);
CREATE INDEX idx_conversatii_user_curs ON conversatii(id_user, id_curs);
```

```sql
CREATE TABLE mesaje_chat (
    id BIGSERIAL PRIMARY KEY,
    id_conversatie BIGINT NOT NULL REFERENCES conversatii(id),
    rol VARCHAR(20) NOT NULL,          -- 'STUDENT', 'PROFESOR' sau 'ASISTENT'
    continut TEXT NOT NULL,
    surse_folosite TEXT,               -- CSV de documentId-uri, nullable (din raspuns.surseFolosite al RAG)
    created_by VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(36),
    updated_at TIMESTAMPTZ
);
CREATE INDEX idx_mesaje_chat_conversatie_created ON mesaje_chat(id_conversatie, created_at DESC);
```

Notă importantă privind design-ul: **NU** lega `Conversatie` de `UserCurs`. Profesorul nu are niciodată un rând în `user_cursuri` pentru propriul curs (acel tabel e exclusiv pentru înrolări de studenți), deci FK-ul trebuie să fie direct către `app_user` + `cursuri`, simetric cu felul în care `Curs.profesor` e deja un FK direct către `User`.

Nu pune unique constraint pe `(id_user, id_curs)` — modelul de sesiuni multiple permite oricâte conversații per pereche user-curs.

## Entități JPA

```java
@Entity
@Table(name = "conversatii")
@Getter @Setter
public class Conversatie extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_user", nullable = false)
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_curs", nullable = false)
    private Curs curs;

    @Column(length = 150)
    private String titlu;

    @Column(nullable = false)
    private Boolean activ = true;
}
```

```java
@Entity
@Table(name = "mesaje_chat")
@Getter @Setter
public class MesajChat extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_conversatie", nullable = false)
    private Conversatie conversatie;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RolMesaj rol;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String continut;

    @Column(name = "surse_folosite", columnDefinition = "TEXT")
    private String surseFolosite;
}
```

```java
public enum RolMesaj {
    STUDENT,
    PROFESOR,
    ASISTENT
}
```

## Repositories

```java
public interface ConversatieRepository extends JpaRepository<Conversatie, Long> {
    List<Conversatie> findByUserIdAndCursIdAndActivTrueOrderByCreatedAtDesc(Long userId, Long cursId);
}

public interface MesajChatRepository extends JpaRepository<MesajChat, Long> {
    List<MesajChat> findTop10ByConversatieIdOrderByCreatedAtDesc(Long conversatieId);
    List<MesajChat> findByConversatieIdOrderByCreatedAtAsc(Long conversatieId);
}
```

Pentru query-ul de "ultimele 10 mesaje, dar în ordine cronologică" (necesar pentru payload-ul RAG): ia rezultatul din `findTop10...Desc`, apoi `Collections.reverse(...)` în service layer — mai simplu decât un query nativ cu subquery.

## Service layer — orchestrare CU FIX DE TRANZACȚIE

**Context critic:** codebase-ul are deja un principiu documentat — orchestratorii care fac apeluri HTTP externe (ex: `DocumentService`) NU pun `@Transactional` pe metoda orchestrator, ca să nu țină o conexiune DB blocată în timpul unui apel de rețea lent. `RagChatService` are timeout de 30s configurat pe `RestClient`. Aplică EXACT același pattern aici — e o cerință de design, nu opțională.

Creează un serviciu nou, neutru pe rol (nu îl pune în `StudentCursService`, pentru că acum și profesorii îl folosesc):

```java
@Service
public class ConversatieService {

    // PAS 1 — tranzacție scurtă: validare acces + rate limit + creare/validare conversatie + salvare mesaj student
    @Transactional
    public MesajChat salveazaIntrebare(Long conversatieId /* null daca e conversatie noua */,
                                         Long userId, Long cursId, String intrebare) {
        // 1. incarca User + Curs
        // 2. verificaAcces(user, curs, scriere=true) -- vezi metoda mai jos
        // 3. verifica rate limit (10 mesaje/minut, cheia mapei = userId, NU studentId -- functioneaza acum si pt profesori)
        // 4. daca conversatieId == null: creeaza Conversatie noua cu titlu = primele ~40 caractere din intrebare
        //    altfel: incarca Conversatie existenta, verifica ownership (conversatie.user.id == userId)
        // 5. salveaza MesajChat(rol=STUDENT, continut=intrebare)
        // arunca: TooManyRequestsException, AccesInterzisException
    }

    // PAS 2 — FARA @Transactional: apel HTTP blocant catre RAG
    public RagChatResponseDTO obtineRaspunsRag(Long conversatieId, Long studentId, Long cursId, String intrebare) {
        // 1. citeste ultimele 10 mesaje din DB (mesajChatRepository.findTop10...Desc + reverse)
        // 2. mapeaza la formatul istoricConversatie asteptat de RagChatService (rol -> "user"/"assistant")
        // 3. apeleaza ragChatService.intreabaAky(...) -- poate arunca RagChatException (502)
    }

    // PAS 3 — tranzactie scurta: salvare raspuns asistent
    @Transactional
    public MesajChat salveazaRaspuns(Long conversatieId, RagChatResponseDTO raspuns) {
        // salveaza MesajChat(rol=ASISTENT, continut=raspuns.raspuns(),
        //                     surseFolosite=join(",", raspuns.surseFolosite()))
    }

    // Metoda de autorizare, ramificata pe rol -- NU presupune ca userul e mereu student
    private void verificaAcces(User user, Curs curs, boolean scriere) {
        boolean acces = switch (user.getRol().getDenumire()) {
            case "PROFESOR" -> curs.getProfesor().getId().equals(user.getId());
            case "STUDENT" -> scriere
                ? userCursRepository.existsByStudentIdAndCursIdAndActivTrue(user.getId(), curs.getId())
                : userCursRepository.existsByStudentIdAndCursId(user.getId(), curs.getId());
            default -> false;
        };
        if (!acces) throw new AccesInterzisException("Nu aveți acces la acest curs.");
    }
}
```

**Controller-ul apelează cele 3 metode în secvență, el însuși fără `@Transactional`.** Dacă Pasul 2 aruncă `RagChatException`, întrebarea din Pasul 1 rămâne salvată (nu se pierde) — handler-ul global întoarce 502 și frontend-ul poate arăta "Aky nu răspunde acum" păstrând mesajul studentului vizibil, cu opțiune de retry care re-apelează doar Pasul 2+3.

**Decizie explicită privind eșecul (KISS):** NU salva niciun `MesajChat` placeholder pentru eșec (ex: nu crea un mesaj `rol=ASISTENT` cu conținut de genul "nu am putut răspunde"). Conversația rămâne pur și simplu cu ultima întrebare a studentului fără pereche de răspuns până la un retry reușit. Frontend-ul detectă cazul ăsta uitându-se dacă ultimul mesaj din listă are `rol=STUDENT` și arată buton de retry pe baza acestui semnal — nu ai nevoie de un flag suplimentar în DB pentru asta.

## Endpoint-uri REST

Toate protejate de sesiune BFF + CSRF (ca restul aplicației). Ownership-ul (nu rolul generic) decide accesul — orice `STUDENT` sau `PROFESOR` poate accesa, verificarea fină e în service layer.

```
GET    /api/cursuri/{cursId}/conversatii
       -> lista conversatiilor active (activ=true) ale userului curent pt acel curs, sortate desc dupa createdAt

POST   /api/cursuri/{cursId}/conversatii/mesaje
       body: {intrebare: string}
       -> creeaza conversatie noua + primul mesaj, ruleaza Pas 1+2+3, returneaza {conversatieId, raspuns}

GET    /api/conversatii/{id}/mesaje
       -> istoric complet cronologic al conversatiei (verifica doar ownership, NU mai verifica inrolare/detinere activa)

POST   /api/conversatii/{id}/mesaje
       body: {intrebare: string}
       -> adauga mesaj intr-o conversatie existenta, ruleaza Pas 1+2+3, returneaza raspunsul

DELETE /api/conversatii/{id}
       -> soft-delete (activ=false), verifica ownership (conversatie.user.id == userul curent)
```

DTO-uri necesare: `ConversatieDTO` (id, titlu, createdAt), `MesajChatDTO` (id, rol, continut, surseFolosite, createdAt), `NouaIntrebareRequest` (intrebare, validată cu `@Size(max = 1000)` — consistent cu limita deja documentată pentru câmpul `intrebare` din `exceptii.md`), `RagRaspunsResponse` (conversatieId, mesajRaspuns).

**Decizie explicită privind citările către documente șterse:** `surseFolosite` se afișează mereu, ca atare, fără să filtrezi documentele care între timp au fost soft-deleted (`Document.activ=false`). NU face un query suplimentar la citirea istoricului ca să verifici starea `activ` a fiecărui `documentId` din `surseFolosite` — istoricul reflectă exact ce a văzut userul la momentul respectiv, e mai corect (fair) așa. Nu trebuie construit niciun mecanism de filtrare sau de "document indisponibil" pentru acest caz.

## Excepții — reutilizează, nu duplica

| Situație | Excepție existentă | Status |
|---|---|---|
| User fără acces (nu owner, nu student înrolat, nu profesor deținător) | `AccesInterzisException` | 403 |
| Rate limit depășit (10 msg/min) | `TooManyRequestsException` | 429 |
| RAG indisponibil/timeout la `/chat` | `RagChatException` | 502 |
| Conversație inexistentă | `UserNotFoundException` NU e potrivită — verifică dacă există deja o excepție generică de 404 în catalog; dacă nu, propune una nouă (`ResursaNegasitaException`, 404) doar dacă chiar lipsește o alternativă |

## Ce să nu faci

- Nu adăuga soft-delete per-mesaj individual — doar la nivel de `Conversatie`.
- Nu pune `@Transactional` pe metoda care include apelul HTTP către RAG.
- Nu lega `Conversatie` de `UserCurs` — leagă direct de `User` + `Curs`.
- Nu schimba formatul payload-ului `/chat` trimis către RAG — doar sursa datelor.
- Nu pune rate limiter-ul înapoi în `StudentCursService` — trebuie să funcționeze și pentru profesori, deci stă în `ConversatieService`, cheiat pe `userId`.
- Nu presupune că userul e mereu `STUDENT` în niciun query sau verificare — verifică explicit rolul.

## Criterii de acceptare

1. Un student înrolat activ poate crea o conversație nouă pe un curs și primește răspuns de la Aky.
2. Un profesor deținător al unui curs poate face același lucru pe propriul curs.
3. Un student care s-a dezînscris nu mai poate trimite mesaje noi, dar poate încă citi conversațiile vechi.
4. Un student care încearcă să acceseze conversația altui student primește 403.
5. La al 11-lea mesaj în același minut, userul primește 429.
6. Dacă RAG-ul e oprit/timeout, mesajul studentului tot rămâne salvat în DB, iar userul primește 502 cu mesaj clar, nu o eroare 500 generică.
7. `DELETE /api/conversatii/{id}` face soft-delete, conversația nu mai apare în `GET /api/cursuri/{cursId}/conversatii`, dar rândurile rămân în DB.
8. Payload-ul trimis efectiv către RAG pe `/chat` e byte-identic ca structură cu ce accepta înainte (verifică cu un test de integrare sau log manual).
