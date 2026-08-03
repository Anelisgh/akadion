# Task pentru agent AI: Autentificare Basic Auth între Spring Boot și serviciul RAG (FastAPI)

## Context

Backend-ul Akadion (Spring Boot) apelează serviciul RAG (FastAPI) pe 3 rute: `POST /ingest`, `DELETE /ingest/{id}`, `POST /chat`. Momentan niciunul din aceste apeluri nu are autentificare — orice client care ajunge la portul FastAPI poate lovi direct aceste rute.

**Important de înțeles înainte să atingi codul:** asta NU e autentificare de utilizator. Autorizarea per-user (verificarea că un student e înrolat activ sau că un profesor deține cursul) se întâmplă deja complet în `ConversatieService`/`DocumentService`, **înainte** ca orice request să ajungă la RAG. Basic Auth aici e strict autentificare service-to-service: confirmă că request-ul vine chiar de la backend-ul Spring, nu de la altcineva care a ghicit URL-ul serviciului RAG. Nu amesteca cele două niveluri.

## Pas 0 — Verificare obligatorie înainte de orice modificare

Nu presupune structura codului — verifică-o efectiv:

1. **Verifică cum sunt construite `RestClient`-urile în `RagIngestService` și `RagChatService`.** Au un bean comun injectat, sau fiecare își construiește propriul `RestClient` intern (ex: `RestClient.create(...)` direct în constructor)? Raportează ce găsești înainte de a continua — asta decide dacă adaugi Basic Auth într-un singur loc sau în două.
2. **Verifică numele exact al proprietății pentru URL-ul RAG.** `configurari.md` menționează `app.rag.base-url`, dar confirmă exact cum apare în `application.properties` din repo, ca proprietățile noi să respecte aceeași convenție de denumire.
3. **Verifică dacă există deja un pachet `config/` cu o clasă dedicată pentru bean-uri HTTP client**, sau dacă `RestClient`-urile sunt construite ad-hoc direct în servicii. Decide locul potrivit pentru bean-ul nou pe baza structurii reale găsite.
4. **Verifică dacă există teste existente** (unit/integrare) pentru `RagIngestService` sau `RagChatService` care mock-uiesc `RestClient` direct, nu printr-un bean injectat. Dacă da, semnalează explicit că refactorizarea le poate rupe și trebuie actualizate — nu le lăsa roșii fără să spui nimic.

## Obiectiv

Adaugă header `Authorization: Basic ...` pe toate cele 3 apeluri către RAG, fără să schimbi payload-urile JSON sau logica de business existentă.

## Ce există deja și NU trebuie modificat

- Payload-urile JSON trimise pe cele 3 rute (`contract-rag.md`) — rămân identice.
- Logica de business din `DocumentService`, `ConversatieService`, `RagIngestService`, `RagChatService`.
- Autorizarea per-utilizator (`verificaAcces`, `StareContFilter`) — complet separată, nu se atinge.

## Modificări de făcut

### 1. Bean de configurare nou (`RagClientConfig.java` în `com.example.akadion.config`)

```java
@Configuration
public class RagClientConfig {

    @Bean
    public RestClient ragRestClient(@Value("${app.rag.base-url}") String baseUrl,
                                      @Value("${app.rag.auth.username}") String username,
                                      @Value("${app.rag.auth.password}") String password) {
        return RestClient.builder()
            .baseUrl(baseUrl)
            .defaultHeaders(headers -> headers.setBasicAuth(username, password))
            .build();
    }
}
```

Modifică `RagIngestService` și `RagChatService` pentru a injecta `ragRestClient`.
Folosește `.mutate()` pentru a adăuga timeout-uri specifice fiecărui serviciu (120s pentru Ingest, 5s/30s pentru Chat).
Elimină injectarea separată de `baseUrl` din servicii și transformă rutele din apeluri absolute în relative (ex. `/ingest`, `/chat`).

### 2. Proprietăți noi

Adaugă variabilele în `application.properties` cu valori default pentru dezvoltarea locală:
```properties
app.rag.auth.username=${RAG_SERVICE_USERNAME:akadion-spring-backend}
app.rag.auth.password=${RAG_SERVICE_PASSWORD:parola_spring_rag}
```
Nu mai este nevoie de adăugare manuală în `application-local.properties` pentru rularea locală, aplicația va folosi fallback-urile în lipsa variabilelor de mediu explicite. Pentru mediile de producție, se vor seta variabilele de mediu `RAG_SERVICE_USERNAME` și `RAG_SERVICE_PASSWORD` (de ex. un secret generat cu `openssl rand -base64 24`).

### 3. Docker Compose și Teste

Adaugă variabilele `RAG_SERVICE_USERNAME`/`RAG_SERVICE_PASSWORD` în `compose.yaml` pentru containerul backend.
De asemenea, adaugă credențiale de test (dummy) în `src/test/resources/application.properties` pentru a evita erorile la `contextLoads()`.

### 4. Tratarea erorii 401 distinct de alte erori RAG (în ambele servicii)

Atât în `RagChatService` cât și în `RagIngestService`, adaugă un log explicit de nivel WARN specific pentru status code 401 (ex. `HttpClientErrorException.Unauthorized`), cu un mesaj de genul "Autentificare eșuată către serviciul RAG — verifică dacă secretul e sincronizat cu echipa RAG". Fără logul ăsta, un 401 arată identic cu "RAG e offline", pierzând timp la debug.

## Ce să nu faci

- Nu pune username/parolă hardcodate în cod sau în `application.properties` — doar în `application-local.properties` (ignorat de git) sau variabile de mediu.
- Nu schimba payload-urile JSON existente pe niciuna din cele 3 rute.
- Nu construi vreun mecanism nou de autentificare per-utilizator — Basic Auth e strict service-to-service.
- Nu presupune structura fișierelor de config fără să verifici efectiv (vezi Pas 0).

## Criterii de acceptare

1. Toate cele 3 apeluri (`POST /ingest`, `DELETE /ingest/{id}`, `POST /chat`) trimit header-ul `Authorization: Basic ...`.
2. Un test manual cu credențiale greșite produce 401 de la FastAPI, capturat corect ca `RagChatException`/`ERONAT` — nu o eroare 500 necontrolată sau o excepție neprinsă.
3. Niciun secret nu apare în `application.properties` sau în istoricul de commit-uri — verifică explicit că `.gitignore` acoperă `application-local.properties`.
4. Payload-urile JSON trimise rămân byte-identice cu ce descrie `contract-rag.md` — Basic Auth adaugă doar un header, nu schimbă body-ul.
5. Log-ul de WARN pentru 401 e distinct (mesaj diferit) față de log-ul pentru timeout/RAG offline.
