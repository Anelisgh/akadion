# Task pentru agent AI: Autentificare Basic Auth ├«ntre Spring Boot ╚Öi serviciul RAG (FastAPI)

## Context

Backend-ul Akadion (Spring Boot) apeleaz─â serviciul RAG (FastAPI) pe 3 rute: `POST /ingest`, `DELETE /ingest/{id}`, `POST /chat`. Momentan niciunul din aceste apeluri nu are autentificare ΓÇö orice client care ajunge la portul FastAPI poate lovi direct aceste rute.

**Important de ├«n╚¢eles ├«nainte s─â atingi codul:** asta NU e autentificare de utilizator. Autorizarea per-user (verificarea c─â un student e ├«nrolat activ sau c─â un profesor de╚¢ine cursul) se ├«nt├ómpl─â deja complet ├«n `ConversatieService`/`DocumentService`, **├«nainte** ca orice request s─â ajung─â la RAG. Basic Auth aici e strict autentificare service-to-service: confirm─â c─â request-ul vine chiar de la backend-ul Spring, nu de la altcineva care a ghicit URL-ul serviciului RAG. Nu amesteca cele dou─â niveluri.

## Pas 0 ΓÇö Verificare obligatorie ├«nainte de orice modificare

Nu presupune structura codului ΓÇö verific─â-o efectiv:

1. **Verific─â cum sunt construite `RestClient`-urile ├«n `RagIngestService` ╚Öi `RagChatService`.** Au un bean comun injectat, sau fiecare ├«╚Öi construie╚Öte propriul `RestClient` intern (ex: `RestClient.create(...)` direct ├«n constructor)? Raporteaz─â ce g─âse╚Öti ├«nainte de a continua ΓÇö asta decide dac─â adaugi Basic Auth ├«ntr-un singur loc sau ├«n dou─â.
2. **Verific─â numele exact al propriet─â╚¢ii pentru URL-ul RAG.** `configurari.md` men╚¢ioneaz─â `app.rag.base-url`, dar confirm─â exact cum apare ├«n `application.properties` din repo, ca propriet─â╚¢ile noi s─â respecte aceea╚Öi conven╚¢ie de denumire.
3. **Verific─â dac─â exist─â deja un pachet `config/` cu o clas─â dedicat─â pentru bean-uri HTTP client**, sau dac─â `RestClient`-urile sunt construite ad-hoc direct ├«n servicii. Decide locul potrivit pentru bean-ul nou pe baza structurii reale g─âsite.
4. **Verific─â dac─â exist─â teste existente** (unit/integrare) pentru `RagIngestService` sau `RagChatService` care mock-uiesc `RestClient` direct, nu printr-un bean injectat. Dac─â da, semnaleaz─â explicit c─â refactorizarea le poate rupe ╚Öi trebuie actualizate ΓÇö nu le l─âsa ro╚Öii f─âr─â s─â spui nimic.

## Obiectiv

Adaug─â header `Authorization: Basic ...` pe toate cele 3 apeluri c─âtre RAG, f─âr─â s─â schimbi payload-urile JSON sau logica de business existent─â.

## Ce exist─â deja ╚Öi NU trebuie modificat

- Payload-urile JSON trimise pe cele 3 rute (`contract-rag.md`) ΓÇö r─âm├ón identice.
- Logica de business din `DocumentService`, `ConversatieService`, `RagIngestService`, `RagChatService`.
- Autorizarea per-utilizator (`verificaAcces`, `StareContFilter`) ΓÇö complet separat─â, nu se atinge.

## Modific─âri de f─âcut

### 1. Bean de configurare nou (`RagClientConfig.java` ├«n `com.example.akadion.config`)

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

Modific─â `RagIngestService` ╚Öi `RagChatService` pentru a injecta `ragRestClient`.
Folose╚Öte `.mutate()` pentru a ad─âuga timeout-uri specifice fiec─ârui serviciu (120s pentru Ingest, 5s/30s pentru Chat).
Elimin─â injectarea separat─â de `baseUrl` din servicii ╚Öi transform─â rutele din apeluri absolute ├«n relative (ex. `/ingest`, `/chat`).

### 2. Propriet─â╚¢i noi

Adaug─â variabilele ├«n `application.properties` cu valori default pentru dezvoltarea local─â:
```properties
app.rag.auth.username=${RAG_SERVICE_USERNAME:akadion-spring-backend}
app.rag.auth.password=${RAG_SERVICE_PASSWORD}
```
Seteaz─â variabilele de mediu `RAG_SERVICE_USERNAME` ╚Öi `RAG_SERVICE_PASSWORD` ├«n mediul local sau de produc╚¢ie; nu p─âstra parola ├«n fi╚Öiere urm─ârite de Git.

### 3. Docker Compose ╚Öi Teste

Adaug─â variabilele `RAG_SERVICE_USERNAME`/`RAG_SERVICE_PASSWORD` ├«n `compose.yaml` pentru containerul backend.
De asemenea, adaug─â creden╚¢iale de test (dummy) ├«n `src/test/resources/application.properties` pentru a evita erorile la `contextLoads()`.

### 4. Tratarea erorii 401 distinct de alte erori RAG (├«n ambele servicii)

At├ót ├«n `RagChatService` c├ót ╚Öi ├«n `RagIngestService`, adaug─â un log explicit de nivel WARN specific pentru status code 401 (ex. `HttpClientErrorException.Unauthorized`), cu un mesaj de genul "Autentificare e╚Öuat─â c─âtre serviciul RAG ΓÇö verific─â dac─â secretul e sincronizat cu echipa RAG". F─âr─â logul ─âsta, un 401 arat─â identic cu "RAG e offline", pierz├ónd timp la debug.

## Ce s─â nu faci

- Nu pune username/parol─â hardcodate ├«n cod sau ├«n `application.properties` ΓÇö doar ├«n `application-local.properties` (ignorat de git) sau variabile de mediu.
- Nu schimba payload-urile JSON existente pe niciuna din cele 3 rute.
- Nu construi vreun mecanism nou de autentificare per-utilizator ΓÇö Basic Auth e strict service-to-service.
- Nu presupune structura fi╚Öierelor de config f─âr─â s─â verifici efectiv (vezi Pas 0).

## Criterii de acceptare

1. Toate cele 3 apeluri (`POST /ingest`, `DELETE /ingest/{id}`, `POST /chat`) trimit header-ul `Authorization: Basic ...`.
2. Un test manual cu creden╚¢iale gre╚Öite produce 401 de la FastAPI, capturat corect ca `RagChatException`/`ERONAT` ΓÇö nu o eroare 500 necontrolat─â sau o excep╚¢ie neprins─â.
3. Niciun secret nu apare ├«n `application.properties` sau ├«n istoricul de commit-uri ΓÇö verific─â explicit c─â `.gitignore` acoper─â `application-local.properties`.
4. Payload-urile JSON trimise r─âm├ón byte-identice cu ce descrie `contract-rag.md` ΓÇö Basic Auth adaug─â doar un header, nu schimb─â body-ul.
5. Log-ul de WARN pentru 401 e distinct (mesaj diferit) fa╚¢─â de log-ul pentru timeout/RAG offline.