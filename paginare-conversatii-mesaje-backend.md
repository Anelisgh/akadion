# Task pentru agent AI: Paginare Backend — Listă Conversații + Istoric Mesaje (Aky)

## Context

Momentan, `ConversatieService` extrage **tot** ce există la un GET: toată lista de conversații a userului, respectiv (undeva) tot istoricul unei conversații sau doar ultimele mesaje, fără posibilitate de a cere batch-ul următor. Pe măsură ce numărul de conversații și lungimea lor cresc, asta nu mai scalează — nici la nivel de payload JSON, nici la nivel de query DB.

**Important de înțeles înainte să atingi codul:** asta e o schimbare strict pe partea de **citire** (GET). Cei 3 pași tranzacționali de trimitere a unui mesaj nou (salvare întrebare → apel RAG → salvare răspuns), logica `are_raspuns`, endpoint-ul de retry și autorizarea per-user (`verificaAcces` — student înrolat activ / profesor owner) **nu se ating și nu se schimbă**.

Sunt două tipuri de paginare, cu tehnici diferite, nu le trata la fel:

1. **Lista de conversații** → paginare clasică offset-based (`Slice`, nu `Page` — nu avem nevoie de `COUNT(*)`, doar de "mai sunt sau nu").
2. **Istoricul mesajelor dintr-o conversație** → paginare de tip **cursor/keyset**, bazată pe `id`-ul mesajului (nu pe `created_at`, ca să evităm ambiguități la mesaje inserate în aceeași milisecundă). Motiv: la scroll în sus, un `OFFSET` mare e costisitor și, dacă între timp se adaugă un mesaj nou, offset-ul se decalează și pot apărea duplicate/mesaje sărite. Cursor-ul evită ambele probleme.

## Pas 0 — Verificare obligatorie înainte de orice modificare

Nu presupune structura codului — verifică-o efectiv:

1. **Verifică semnătura exactă curentă** a metodei din `MesajeChatRepository` (sau echivalent) care extrage mesajele unei conversații, și a celei din `ConversatieRepository` care listează conversațiile unui user. Raportează ce găsești (nume metodă, tip returnat, dacă există deja vreo limitare).
2. **Verifică definiția exactă a indexului compus** din migrarea Flyway pe `mesaje_chat` — e `(id_conversatie, created_at DESC)` sau deja `(id_conversatie, id DESC)`? Dacă e pe `created_at`, va trebui o migrare nouă care să-l schimbe pe `id` (verifică întâi dacă indexul vechi mai e folosit explicit altundeva înainte să-l elimini).
3. **Verifică controller-ul și DTO-urile actuale** expuse pe rutele de listare conversații și de istoric mesaje (nume exacte, path-uri, ce câmpuri conțin DTO-urile de răspuns).
4. **Verifică dacă frontend-ul are deja apeluri hardcodate** către aceste rute fără parametri (în `aky.js` sau echivalent), ca noii parametri de query să aibă valori default care păstrează comportamentul actual identic dacă nu sunt trimiși.
5. Nu presupune numele claselor DTO — verifică efectiv pachetul `dto`.

## Obiectiv

- `GET` listă conversații → acceptă `page` și `size` (default `page=0`, `size=20`), returnează un batch + flag `areUrmatoarea`.
- `GET` istoric mesaje → acceptă `inainteDe` (id-ul celui mai vechi mesaj deja încărcat pe frontend, opțional) și `limit` (default 20), returnează un batch ordonat crescător + flag `areMaiMulte` + `celMaiVechiIdIncarcat`.
- Fără parametri trimiși, ambele rute trebuie să se comporte cât mai aproape de identic cu azi (primul batch / cele mai recente mesaje).
- **Rutele rămân aceleași** — se adaugă parametri de query opționali, nu rute noi.

## Ce există deja și NU trebuie modificat

- Cei 3 pași tranzacționali din `ConversatieService` pentru trimiterea unui mesaj nou.
- Coloana `are_raspuns` și logica ei de retry.
- `RagChatService`, payload-ul trimis către RAG, contractul din `contract-rag.md`.
- Verificarea de acces (`verificaAcces` cu ramificație pe rol `PROFESOR`/`STUDENT`) — rămâne apelată **înainte** de orice query paginat, nu se relaxează.
- Soft-delete-ul la nivel de conversație.

## Modificări de făcut

### 1. Migrare Flyway (doar dacă Pasul 0.2 arată că e necesar)

Dacă indexul e pe `created_at`, adaugă o migrare nouă care creează `(id_conversatie, id DESC)`. Nu șterge orbește indexul vechi dacă apare folosit și în altă parte — raportează și lasă decizia finală explicită înainte de a-l elimina.

### 2. Repository

```java
// Lista de conversatii — offset-based, Slice nu Page (fara COUNT suplimentar)
Slice<Conversatie> findByAppUserIdAndActivTrueOrderByUpdatedAtDesc(Long userId, Pageable pageable);

// Istoric mesaje — keyset/cursor pe id
List<MesajChat> findByConversatieIdAndIdLessThanOrderByIdDesc(
    Long conversatieId, Long cursorId, Pageable pageable);

// Varianta pentru load initial (fara cursor) — poate fi aceeasi metoda
// apelata cu cursorId = Long.MAX_VALUE, sau o metoda separata echivalenta
```

Cere `limit + 1` rânduri în ambele cazuri, ca să deduci `areUrmatoarea`/`areMaiMulte` din prezența celui de-al `limit+1`-lea rezultat, fără query suplimentar de `COUNT`.

### 3. Service

Adaptează metodele existente (ex. `listaConversatii`, `obtineIstoric`) să primească parametrii de paginare, păstrând verificarea de acces/ownership **înainte** de a rula query-ul paginat. Pentru mesaje, rezultatul din repository vine ordonat descrescător (cel mai recent primul) — inversează-l înainte de a-l pune în DTO, ca frontend-ul să primească mesajele deja în ordine cronologică crescătoare, gata de `prepend`/afișat direct.

### 4. Controller

Adaugă parametri de query opționali cu default-uri, fără să schimbi path-ul:

```
GET /api/conversatii?page=0&size=20
GET /api/conversatii/{id}/mesaje?inainteDe={id}&limit=20
```

`inainteDe` trebuie să fie opțional (`@RequestParam(required = false) Long inainteDe`) — dacă lipsește, se cere ultimul batch (cele mai recente `limit` mesaje), exact comportamentul de azi.

### 5. DTO-uri noi de răspuns

```java
public record ConversatiiPaginateDto(
    List<ConversatieDto> continut,
    boolean areUrmatoarea
) {}

public record IstoricMesajeDto(
    List<MesajDto> mesaje,       // ordonate crescator, gata de randat
    boolean areMaiMulte,
    Long celMaiVechiIdIncarcat   // null daca lista e goala
) {}
```

## Ce să nu faci

- Nu folosi `Page<T>` cu `COUNT(*)` — nu avem nevoie de total, doar de `Slice`.
- Nu pagina mesajele cu `OFFSET` — doar cursor pe `id`.
- Nu schimba nimic din cei 3 pași tranzacționali sau din logica `are_raspuns`.
- Nu schimba payload-ul trimis către RAG sau contractul din `contract-rag.md`.
- Nu elimina indexul vechi fără să verifici explicit dacă mai e folosit altundeva (Pas 0.2).
- Nu introduce parametri obligatorii pe rutele existente — trebuie să rămână apelabile fără parametri, cu comportament echivalent celui actual.

## Criterii de acceptare

1. `GET /api/conversatii` fără parametri se comportă ca azi (primul batch, cele mai recente conversații active).
2. `GET /api/conversatii?page=1&size=20` returnează următorul batch, fără `COUNT(*)` suplimentar în query-ul generat (verifică în log-ul Hibernate/SQL).
3. `GET /api/conversatii/{id}/mesaje` fără `inainteDe` returnează ultimele `limit` mesaje, ordonate crescător.
4. `GET /api/conversatii/{id}/mesaje?inainteDe=X` returnează exact mesajele mai vechi decât id-ul `X`, fără duplicate față de batch-ul anterior, indiferent dacă între timp s-au adăugat mesaje noi în conversație.
5. Verificarea de acces (ownership/înrolare) rulează în continuare înainte de orice query paginat — un user neautorizat primește `AccesInterzisException` (403), nu date paginate goale.
6. Niciun test existent pe `ConversatieService`/`ConversatieController` nu rămâne roșu fără să fie semnalat explicit și actualizat.
