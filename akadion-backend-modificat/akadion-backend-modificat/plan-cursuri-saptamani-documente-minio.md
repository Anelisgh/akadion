# Plan Implementare: Gestionare Cursuri/Săptămâni/Documente (Profesor) + Integrare MinIO

## Cum se folosește acest plan

Dă agentului **câte o Etapă odată**, verifică rezultatul, apoi treci mai departe. Marcaje:
- 🖱️ **MANUAL** — faci tu (Docker, consolă MinIO)
- 🤖 **AGENT** — dai secțiunea unui agent AI de cod

**Presupunere de bază**: entitățile JPA (`Curs`, `Saptamana`, `Document`, `UserCurs`) **există deja** (vezi `README-ENTITATI.md`) — acest plan NU le recreează. Dacă agentul constată că vreo entitate lipsește sau diferă de ce e descris mai jos, oprește-te și verifică înainte să continui, nu presupune.

Package Java folosit ca exemplu: `com.example.akadion` (ajustează dacă diferă).

---

## Context de business (citește înainte de orice etapă)

### Reguli stabilite, obligatorii de respectat exact

1. **`NR_SAPTAMANI` nu e coloană stocată** — se calculează mereu din `SAPTAMANA` (`COUNT`/`MAX(NR_SAPTAMANA)` pentru cursul respectiv). Nu adăuga nicio coloană nouă pentru asta.

2. **`DATA_INCEPUT`/`DATA_SFARSIT` — ambele nullable, opțional definitiv.** Dacă `DATA_INCEPUT` e setat, `DATA_SFARSIT` se **recalculează automat** la fiecare adăugare/ștergere de săptămână: `DATA_SFARSIT = DATA_INCEPUT + (nr_saptamani_curent * 7 zile)`. Dacă `DATA_INCEPUT` e `NULL`, sari peste calcul — `DATA_SFARSIT` rămâne `NULL`, fără eroare.

3. **`SAPTAMANA.NR_SAPTAMANA` se atribuie mereu automat de backend** (`MAX` existent + 1) — niciodată acceptat din request. Ștergere permisă **doar pentru ultima săptămână** (`NR_SAPTAMANA` maxim al cursului) — oricând, indiferent dacă are `PARCURS` legat de ea sau nu (`PARCURS` e fără istoric, ușor de modificat de student prin check/uncheck — nu e un record protejat). Ștergerea unei săptămâni face cascadă: șterge hard toate rândurile `DOCUMENT` ale ei ȘI obiectele corespunzătoare din MinIO (nu doar DB — fișierele orfane rămân la nesfârșit dacă uiți pasul ăsta), ȘI toate rândurile `PARCURS` legate de ea.

⚠️ **Constrângere unică `(id_curs, nr_saptamana)` obligatorie la nivel de DB.** Fără ea, două request-uri aproape simultane (ex. dublu-click pe "Adaugă săptămână", fără disable la submit) pot citi amândouă același `MAX` înainte ca vreunul să fi comis, și insera două săptămâni cu același număr — corupe silențios invariantul de "fără găuri, fără duplicate" pe care se bazează atât ștergerea ultimei săptămâni, cât și recalcularea `DATA_SFARSIT`. Vezi Etapa 5 pentru constrângere exactă + tratarea excepției.

4. **`DOCUMENT`**: adăugare = upload nou în MinIO + rând nou. Ștergere = soft-delete (`ACTIV=false`), fișierul **rămâne** în MinIO. Modificare = permite și înlocuirea fișierului efectiv (vezi Etapa 7 pentru fluxul exact — șterge vechiul obiect din MinIO DUPĂ ce noul upload reușește, nu invers, ca să nu pierzi fișierul dacă noul upload eșuează).

⚠️ **La soft-delete, anunță și RAG** (`DELETE /ingest/{documentId}`, vezi contractul de mai jos) — altfel chatbot-ul continuă să folosească vectori ai unui document șters. Best-effort, la fel ca `/ingest` — nu blochează operațiunea locală dacă eșuează. (Notă: Înlocuirea fișierului pe un document existent folosește direct `POST /ingest` care face UPSERT atomic, deci nu folosește `DELETE` pentru înlocuire).

5. **Dezactivare/reactivare curs (de către profesorul propriu, NU de admin — cascada de admin e stabilită separat)**:
   - **Dezactivare**: curs → `ACTIV=false`, toate `USER_CURS` ale cursului → `ACTIV=false`
   - **Reactivare**: curs → `ACTIV=true`, `USER_CURS` **rămân inactive** — studenții trebuie să se re-înscrie manual. Decizie deliberată: nu distingem între "dezactivat din cauza cursului" și "ieșit voluntar" fără o coloană suplimentară, și preferăm simplitatea.
   ⚠️ **Implicație pentru feature-ul viitor de înscriere la curs**: tabelul `user_cursuri` are `UNIQUE(id_student, id_curs)`. Logica de re-înscriere trebuie să caute `USER_CURS` existent cu `ACTIV=false` și să-l seteze `ACTIV=true` — nu să insereze un rând nou (ar produce constraint violation).
   - Nu atinge `PARCURS` — interogarile de progres oricum trec prin `USER_CURS` activ, nu direct prin `PARCURS`.

6. **`DOCUMENT.statusIndex`** (`PRELUAT`/`TRIMIS`/`ERONAT`) reflectă rezultatul **imediat, sincron** al apelului `POST /ingest` către FastAPI — NU vine dintr-un callback ulterior de la RAG. `PRELUAT` = fișier salvat (MinIO + DB), încă netrimis. `TRIMIS` = apelul `/ingest` a reușit. `ERONAT` = apelul a eșuat. Un document `ERONAT` rămâne complet funcțional/vizibil în aplicație — statusul ăsta afectează doar chatbot-ul RAG, nu documentul în sine.

7. **Ownership obligatoriu pe fiecare endpoint de profesor**: `ID_PROFESOR` se extrage mereu din userul autentificat (sub Keycloak → `User` din DB), niciodată din body-ul request-ului. Fiecare acțiune pe curs/săptămână/document verifică explicit că aparține profesorului logat — altfel orice profesor ar putea edita cursul altcuiva ghicind un ID.

### Contract cu echipa RAG (`POST /ingest`)

```json
{
  "documentId": 123,
  "cursId": 45,
  "saptamanaId": 12,
  "profesorId": 7,
  "titlu": "Curs 3 - Introducere in ORM",
  "pathMinio": "curs-45/saptamana-12/a1b2c3d4-curs3.pdf",
  "extensie": "pdf",
  "cursDenumire": "Baze de date avansate",
  "nrSaptamana": 3
}
```
Orice răspuns `2xx` → `TRIMIS`. Orice eroare/excepție → `ERONAT`, dar upload-ul documentului **nu se anulează** (vezi regula 6).

⚠️ **`DELETE /ingest/{documentId}`** — al doilea capăt al contractului, la fel de important. Fără el, RAG continuă să folosească vectori/embeddings ale unor documente șterse de voi — chatbot-ul ar cita conținut care nu mai există. Se apelează la soft-delete de document (regula 4) și la ștergerea săptămânii (Etapa 5). Ca și la `/ingest`, best-effort — dacă eșuează, ștergerea la voi tot se finalizează, doar loghezi eroarea.

### Convenție MinIO

```
Bucket: akadion-documente
Key:    curs-{idCurs}/saptamana-{idSaptamana}/{uuid-random}-{nume-fisier-original}
```

---

## Etapa 0 — 🖱️ MANUAL: MinIO local, pentru testare solo

1. Pornește un MinIO standalone (Docker):
```bash
docker run -d --name minio-local \
  -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin123" \
  -v minio-data:/data \
  quay.io/minio/minio server /data --console-address ":9001"
```
Port `9000` = API-ul S3-compatibil (folosit de aplicație), port `9001` = consola web de administrare.

2. Deschide `http://localhost:9001`, autentifică-te cu `minioadmin`/`minioadmin123`.

3. Creează bucket-ul `akadion-documente` (buton "Create Bucket" din consolă).

4. (Opțional, dar recomandat) Creează un Access Key dedicat aplicației (Access Keys → Create — nu folosi root user-ul în cod), notează `Access Key` + `Secret Key`.

✅ **Verificare**: bucket-ul `akadion-documente` apare gol în consola web, la `http://localhost:9001`.

⚠️ Când colegii de RAG au docker-compose-ul comun gata, înlocuiești doar `minio.url`/`access-key`/`secret-key` din config cu valorile lor — restul codului nu se schimbă deloc, fiindcă backend-ul vorbește cu MinIO exclusiv prin config, nu prin adrese hardcodate.

---

## Etapa 1 — 🤖 AGENT: Dependință + configurare

### 1.1 `pom.xml`
Adaugă (verifică mai întâi dacă nu există deja):
```xml
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>8.5.7</version>
</dependency>
```

### 1.2 `application.properties` — adaugă:
```properties
minio.url=http://localhost:9000
minio.access-key=${MINIO_ACCESS_KEY}
minio.secret-key=${MINIO_SECRET_KEY}
minio.bucket=akadion-documente

app.rag.base-url=${RAG_BASE_URL:http://localhost:8000}

spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB
```
`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` — variabile de mediu, la fel ca secretele Keycloak, necomise în git. `RAG_BASE_URL` are o valoare implicită (`localhost:8000`) fiindcă echipa RAG probabil nu are încă un mediu stabil — ajustează când au.

### 1.3 `config/MinioConfig.java`
```java
@Configuration
public class MinioConfig {
    @Value("${minio.url}") private String url;
    @Value("${minio.access-key}") private String accessKey;
    @Value("${minio.secret-key}") private String secretKey;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
            .endpoint(url)
            .credentials(accessKey, secretKey)
            .build();
    }
}
```

✅ **Verificare**: aplicația pornește fără erori (confirmă că bean-ul `MinioClient` se creează corect, chiar dacă încă nu-l folosește nimeni).

### 1.4 `exception/GlobalExceptionHandler.java` — adaugă handlere pentru excepțiile noi

Proiectul are deja un `GlobalExceptionHandler` (`@RestControllerAdvice`) cu handlere pentru `UserNotFoundException`, `InvalidUserStateException`, `ForbiddenOperationException`, `KeycloakConflictException`, `KeycloakIntegrationException`. Trebuie extinse cu:

```java
// 1. Acces interzis la resursa altui profesor (ownership check eșuat)
@ExceptionHandler(AccesInterzisException.class)
@ResponseStatus(HttpStatus.FORBIDDEN)
public Map<String, Object> handleAccesInterzis(AccesInterzisException ex) {
    return Map.of("status", HttpStatus.FORBIDDEN.value(), "eroare", ex.getMessage());
}

// 2. Conflict de concurență la adaugarea simultană a două săptămâni
@ExceptionHandler(SaptamanaConcurentaException.class)
@ResponseStatus(HttpStatus.CONFLICT)
public Map<String, Object> handleSaptamanaConcurenta(SaptamanaConcurentaException ex) {
    return Map.of("status", HttpStatus.CONFLICT.value(), "eroare", ex.getMessage());
}

// 3. Eroare de upload/interacțiune MinIO (fișier indisponibil, bucket inaccesibil etc.)
@ExceptionHandler(MinioIntegrationException.class)
@ResponseStatus(HttpStatus.BAD_GATEWAY)
public Map<String, Object> handleMinioIntegration(MinioIntegrationException ex) {
    log.error("Eroare integrare MinIO: {}", ex.getMessage(), ex);
    return Map.of("status", HttpStatus.BAD_GATEWAY.value(),
                  "eroare", "Eroare de stocare fișiere. Verificați logurile și reîncercați.");
}

// 4. Fișier depășește limita configurată în application.properties (50MB)
// Fără acest handler, Spring trimite un răspuns 500 sau HTML brut în loc de JSON curat
@ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
@ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
public Map<String, Object> handleFileTooLarge(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
    return Map.of("status", 413, "eroare", "Fișierul depășește dimensiunea maximă permisă (50MB).");
}
```

⚠️ **Despre `SecurityConfig`**: nu trebuie modificat pentru rutele noi. Config-ul existent folosește `.anyRequest().authenticated()` (orice rută cere autentificare) și `@EnableMethodSecurity` activ — ceea ce înseamnă că `@PreAuthorize("hasRole('PROFESOR')")` de pe controllere funcționează direct, fără modificare în security config. `StareContFilter` se aplică și el automat pe toate cererile autentificate, inclusiv cele noi.

---

## Etapa 2 — 🤖 AGENT: Repository-uri (creează doar ce lipsește)

Verifică întâi dacă există deja — creează doar ce lipsește:
- `CursRepository extends JpaRepository<Curs, Long>` — adaugă `@EntityGraph(attributePaths = {"profesor"}) List<Curs> findByProfesorId(Long profesorId)` (evită N+1 la `curs.getProfesor()`, consecvent cu pattern-ul deja introdus de coleg pe `UserRepository`)
- `SaptamanaRepository extends JpaRepository<Saptamana, Long>`:
  * Adaugă `List<Saptamana> findByCursIdOrderByNrSaptamana(Long cursId)`
  * Adaugă `Optional<Saptamana> findTopByCursIdOrderByNrSaptamanaDesc(Long cursId)`
  * Adaugă `@EntityGraph(attributePaths = {"curs", "curs.profesor"}) Optional<Saptamana> findWithCursAndProfesorById(Long id)` (previne `LazyInitializationException` în `DocumentService` unde nu avem `@Transactional`)
- `DocumentRepository extends JpaRepository<Document, Long>`:
  * Adaugă `@EntityGraph(attributePaths = {"saptamana", "saptamana.curs"}) List<Document> findBySaptamanaIdAndActivTrue(Long saptamanaId)` (folosit la GET documente active ale unei săptămâni)
  * Adaugă `List<Document> findAllBySaptamanaId(Long saptamanaId)` (— fără filtrul `AndActivTrue` — folosit exclusiv în `stergeUltimaSaptamana` ca să obții **toate** documentele, inclusiv cele soft-deleted, pentru ștergerea din MinIO și RAG)
  * Adaugă `@EntityGraph(attributePaths = {"saptamana", "saptamana.curs", "saptamana.curs.profesor"}) Optional<Document> findWithSaptamanaAndCursAndProfesorById(Long id)` (previne `LazyInitializationException` în `DocumentService` la modificări/ștergeri)
- `UserCursRepository extends JpaRepository<UserCurs, Long>` — adaugă `List<UserCurs> findByCursId(Long cursId)`
- `ParcursRepository extends JpaRepository<Parcurs, Long>` — adaugă `List<Parcurs> findBySaptamanaId(Long saptamanaId)` (folosit doar la cascada de ștergere a ultimei săptămâni, Etapa 5 — nu pentru validare, doar ca să știi ce rânduri să ștergi)
- `SaptamanaRepository` — adaugă și `long countByCursId(Long cursId)` (folosit de `CursService.recalculeazaDataSfarsit` și de maparea câmpului `nrSaptamaniCurente` în `CursResponseDto`)

⚠️ **Notă legată de `spring.jpa.open-in-view=false`** (setat de colegul vostru): fără sesiune Hibernate ținută deschisă pe tot request-ul, orice acces la o relație lazy (`curs.getProfesor().getNume()`, `document.getSaptamana()`) trebuie să se întâmple **strict în interiorul metodei `@Transactional` din service**, sau să fie încărcat explicit prin `@EntityGraph` (vezi metodele de mai sus folosite în `DocumentService` unde nu avem `@Transactional`). Maparea Entity→DTO din Etapa 8 se face în service, înainte de `return`.

✅ **Verificare**: proiectul compilează.

---

## Etapa 3 — 🤖 AGENT: `MinioStorageService` (generic, reutilizabil)

`service/MinioStorageService.java`:

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class MinioStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    public String uploadFile(MultipartFile file, Long cursId, Long saptamanaId) {
        String originalFilename = file.getOriginalFilename();
        String sanitizedFilename = originalFilename != null 
                ? originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_") 
                : "file_" + UUID.randomUUID().toString().substring(0, 8);
                
        String key = "curs-%d/saptamana-%d/%s-%s".formatted(
                cursId, saptamanaId, UUID.randomUUID(), sanitizedFilename);
        try (InputStream is = file.getInputStream()) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket).object(key)
                    .stream(is, file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
        } catch (Exception e) {
            throw new MinioIntegrationException("Eroare la upload în MinIO pentru " + key, e);
        }
        return key;
    }

    public void deleteFile(String key) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());
        } catch (Exception e) {
            // Loghează, nu arunca — o ștergere eșuată de fișier orfan nu trebuie să blocheze restul fluxului
            log.error("Eroare la ștergerea din MinIO a obiectului {}: {}", key, e.getMessage());
        }
    }

    /**
     * Ștergere secvențială a mai multor fișiere (folosită la Etapa 5, cascada de ștergere a unei săptămâni).
     * Refolosește {@link #deleteFile(String)} care are propriul try-catch — un fișier care nu poate fi șters
     * nu oprește ștergerea celorlalte.
     *
     * ⚠️ Alternativa cu {@code removeObjects()} (bulk S3) a fost evitată intenționat: API-ul MinIO
     * returnează un {@code Iterable<Result<DeleteError>>} evaluat LAZY — dacă nu iterezi rezultatele,
     * ștergerile nu se execută efectiv, iar erorile individuale sunt ușor de ratat.
     */
    public void deleteFiles(List<String> keys) {
        for (String key : keys) {
            deleteFile(key); // deleteFile are try-catch propriu — nu aruncă excepție
        }
    }

    public String getPresignedUrl(String key) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET).bucket(bucket).object(key)
                    .expiry(1, TimeUnit.HOURS).build());
        } catch (Exception e) {
            throw new MinioIntegrationException("Eroare la generarea URL-ului presemnat pentru " + key, e);
        }
    }
}
```
⚠️ `deleteFile`/`deleteFiles` loghează eroarea în loc s-o propage — intenționat (vezi Etapa 5, cascada de ștergere: dacă ștergerea unui fișier din MinIO eșuează la mijlocul cascadei, preferăm să continuăm ștergerea celorlalte documente/rândul din DB, nu să lăsăm operațiunea pe jumătate făcută).

Creează și `exception/MinioIntegrationException.java` (`RuntimeException` simplu, la fel ca `KeycloakIntegrationException` deja existentă).

✅ **Verificare**: din orice test/endpoint temporar, un `uploadFile` urmat de `getPresignedUrl` produce un link funcțional — accesat în browser, descarcă fișierul.

---

## Etapa 4 — 🤖 AGENT: `CursService`

`service/CursService.java` — toate metodele sunt `@Transactional` (implicit prin `save()`/`findById()` cu relații), deci sesiunea JPA e activă și accesul la `curs.getProfesor().getId()` pentru verificarea ownership-ului e sigur. Validări de ownership pe FIECARE metodă (`curs.getProfesor().getId().equals(profesorId)`, altfel `403`/excepție dedicată, ex. `AccesInterzisException`):

- `listaCursuriProprii(Long profesorId)`: `findByProfesorId` (returnează lista direct, fără verificare ownership — interogarea e deja filtrată pe `profesorId`)
- `listaToateCursurile()`: returnează toate cursurile din baza de date (`CursRepository.findAll()`), mapate la `CursResponseDto`. Această metodă administrativă este folosită de admin pentru a vizualiza toate cursurile (active și inactive, ale tuturor profesorilor).
- `getCursById(Long cursId, Long callerId, String callerRole)`: caută cursul în repository (`findById`). Verifică ownership: dacă `callerRole` este `PROFESOR`, atunci `curs.getProfesor().getId().equals(callerId)` trebuie să fie adevărat (altfel aruncă `AccesInterzisException`). Dacă `callerRole` este `ADMIN`, permite citirea fără verificare de ownership (read-only).
- `dezactiveazaToateCursurileProfesorului(Long profesorId)` — marcat `@Transactional`: caută toate cursurile asociate profesorului folosind `CursRepository.findByProfesorId(profesorId)`. Pentru fiecare curs din listă, setează `activ = false` (dacă nu era deja inactiv) și dezactivează toate înscrierile asociate acestuia din `UserCursRepository` (sets `activ = false`). Această metodă este apelată de `AdminUserService` în mod automat în cadrul cascadei la dezactivarea profesorului.
- `creazaCurs(Long profesorId, CursRequestDto dto)`: `DENUMIRE`, `DESCRIERE`, `DATA_INCEPUT` (opțional) — `DATA_SFARSIT` rămâne `NULL` la creare (0 săptămâni, nimic de calculat)
- `modificaCurs(Long cursId, Long profesorId, CursRequestDto dto)`: actualizează `DENUMIRE`/`DESCRIERE`/`DATA_INCEPUT`; dacă `DATA_INCEPUT` s-a schimbat:
  - Dacă noua valoare e `null` → setează explicit și `DATA_SFARSIT = null` (nu apela `recalculeazaDataSfarsit` — aceasta ar găsi `null` și ar returna fără să atingă `DATA_SFARSIT`, lăsând-o cu valoarea veche calculată)
  - Dacă noua valoare e non-null → apelează `recalculeazaDataSfarsit(curs)` care calculează corect `DATA_SFARSIT`
- `dezactiveazaCurs(Long cursId, Long profesorId)`: Dacă cursul e deja `ACTIV=false`, returnează `200 OK` silențios (idempotent). Altfel: setează `ACTIV=false` pe curs, apoi iterează `UserCursRepository.findByCursId(cursId)` și setează `ACTIV=false` pe fiecare
- `activeazaCurs(Long cursId, Long profesorId)`: Dacă cursul e deja `ACTIV=true`, returnează `200 OK` silențios. Altfel: setează `ACTIV=true` pe curs, **NU atinge `USER_CURS`** — studenții se re-înscri_ manual. Decizie deliberată, nu omisiune.

Extrage un helper privat comun `recalculeazaDataSfarsit(Curs curs)`:
- Dacă `curs.getDataInceput() == null`, nu face nimic.
- Dacă numărul de săptămâni obținut prin `saptamanaRepository.countByCursId(curs.getId())` este `0`, setează explicit `curs.setDataSfarsit(null)` (de exemplu, la ștergerea tuturor săptămânilor).
- Altfel, `dataSfarsit = dataInceput.plusDays(count * 7L - 1)`. Formula corectă: un curs de 1 săptămână care începe luni se termină duminică, nu lunea următoare (`7 * N - 1` zile). Refolosește-l și la Etapa 5.

⚠️ Metodele `dezactiveazaCurs` și `activeazaCurs` trebuie marcate explicit cu `@Transactional` — modifică mai multe entități (`Curs` + N rânduri `UserCurs`) și trebuie garantat că fie toate se salvează, fie niciuna (atomicitate). Fără `@Transactional`, un crash la mijlocul iterației lasă cursul dezactivat dar o parte din `USER_CURS` încă active — stare coruptă.

✅ **Verificare**: creare curs fără `DATA_INCEPUT` → `DATA_SFARSIT` rămâne `NULL`, fără eroare. Dezactivare curs cu studenți înscriși → `USER_CURS` ale lor devin `false`.

---

## Etapa 4.5 — 🤖 AGENT: Tranzacționalitate & Cascadă Dezactivare Profesor în `AdminUserService`

`service/AdminUserService.java` — refactorizează metodele `dezactiveazaUser(Long userId)` și `activeazaUser(Long userId)` pentru a separa apelurile externe către Keycloak de tranzacțiile bazei de date. De asemenea, propagă dezactivarea pe toate cursurile sale în caz că utilizatorul este profesor:

1. **Elimină `@Transactional`** de pe metodele orchestratoare `dezactiveazaUser(Long userId)` și `activeazaUser(Long userId)`.
2. **Creează metode tranzacționale separate** (de tip `public` sau package-private, ex: `executeLocalDeactivation(Long userId)` și `executeLocalReactivation(Long userId)`) marcate cu `@Transactional`:
   - `executeLocalDeactivation(Long userId)`:
     - Caută utilizatorul, verifică starea (`ACTIV`), mută starea locală a contului în `INACTIV` și salvează.
     - Injectează `CursService` și verifică dacă rolul utilizatorului este profesor: `if (user.getRol() != null && "PROFESOR".equals(user.getRol().getDenumire()))`.
     - Dacă da, apelează: `cursService.dezactiveazaToateCursurileProfesorului(userId);`.
     - Returnează obiectul `User`.
   - `executeLocalReactivation(Long userId)`:
     - Caută utilizatorul, verifică starea (`INACTIV`), mută starea locală a contului în `ACTIV` și salvează.
     - ⚠️ **Regulă de simetrie**: Cursurile profesorului reactivat **RĂMÂN inactive** (nu se reactivează automat). Profesorul va trebui să le reactiveze manual, unul câte unul, asigurând consistența cu regula de "fără cascade automate la reactivare".
     - Returnează obiectul `User`.
3. **În metodele orchestratoare (în afara tranzacției DB)**:
   - Pentru `dezactiveazaUser(Long userId)`:
     - Apelează `executeLocalDeactivation(userId)`.
     - Apoi, într-un bloc `try-catch`, apelează `keycloakAdminService.dezactiveazaUser(user.getIdKeycloak())`. Dacă eșuează, loghează un `warn` fără a arunca excepția (dezactivarea DB nu face rollback, apelul Keycloak este tratat ca best-effort).
   - Pentru `activeazaUser(Long userId)`:
     - Apelează `executeLocalReactivation(userId)`.
     - Apoi, într-un bloc `try-catch`, apelează `keycloakAdminService.reactiveazaUser(user.getIdKeycloak())`. Loghează `warn` dacă eșuează.

✅ **Verificare**: Dezactivarea unui profesor dezactivează local contul, toate cursurile lui și înscrierile asociate (`USER_CURS.activ = false`), chiar dacă Keycloak este temporar offline (fără rollback pe DB). Reactivarea profesorului îi repornește contul, dar cursurile sale rămân inactive până le activează manual.

---

## Etapa 5 — 🤖 AGENT: `SaptamanaService`

### 5.0 Constrângere unică pe entitate și Nullability în bază de date (Flyway V2)

Pe entitatea `Saptamana`, adaugă (dacă nu există deja):
```java
@Table(name = "saptamani", uniqueConstraints = @UniqueConstraint(name = "uk_saptamani_curs_nr", columnNames = {"id_curs", "nr_saptamana"}))
```
```sql
-- 1. Permitem valori NULL pentru datele cursului (cerință Etapa 4)
ALTER TABLE cursuri ALTER COLUMN data_inceput DROP NOT NULL;
ALTER TABLE cursuri ALTER COLUMN data_sfarsit DROP NOT NULL;

-- 2. Constrângere de unicitate pe săptămânile aceluiași curs (cerință Etapa 5)
ALTER TABLE saptamani ADD CONSTRAINT uk_saptamani_curs_nr UNIQUE (id_curs, nr_saptamana);
```

`service/SaptamanaService.java`:

- `adaugaSaptamana(Long cursId, Long profesorId, SaptamanaRequestDto dto)` — marcat `@Transactional`: save saptamana + recalculeazaDataSfarsit trebuie sa fie atomice (altfel poti returna 201 cu saptamana noua dar DATA_SFARSIT inca aratand valoarea pentru N-1 saptamani — inconsistenta vizibila in UI):
  1. Verifică ownership curs
  2. `nrSaptamana` = `findTopByCursIdOrderByNrSaptamanaDesc(cursId)` + 1 (sau `1` dacă nu există nicio săptămână încă)
  3. Salvează — ⚠️ **prinde explicit `DataIntegrityViolationException`** în jurul acestui `save()`: dacă apare (altcineva a inserat concurent aceeași pereche `id_curs`+`nr_saptamana`), aruncă `SaptamanaConcurentaException` (mapata la `409 Conflict`) — nu lăsa stacktrace-ul brut de Hibernate să ajungă la frontend
  4. Apelează `recalculeazaDataSfarsit(curs)` de la `CursService`
- `modificaSaptamana(Long saptamanaId, Long profesorId, SaptamanaRequestDto dto)`: doar `DESCRIERE` editabilă — `NR_SAPTAMANA` nu se schimbă niciodată
  1. Încarcă săptămâna (`findWithCursAndProfesorById(saptamanaId)` pentru a evita LazyInit)
  2. Verifică ownership curs (profesorul cursului asociat săptămânii == profesorId din token — altfel `AccesInterzisException`)
  3. Actualizează descrierea și salvează.
- `stergeUltimaSaptamana(Long saptamanaId, Long profesorId)` — marcat `@Transactional`:
  1. Verifică ownership (prin curs)
  2. Verifica `saptamana.getNrSaptamana()` == `findTopByCursIdOrderByNrSaptamanaDesc(cursId)` — daca NU e ultima, `400`, refuz explicit
  3. **Colecteaza** cheile MinIO: `documentRepository.findAllBySaptamanaId(saptamanaId)` (inclusiv soft-deleted!), extrage `List<String> cheiMinio` si `List<Long> idDocumente` - fara sa stergi inca nimic
  4. **DB first (`@Transactional` activ)**: sterge hard toate randurile `PARCURS` ale saptamanii, then `DOCUMENT`, then `SAPTAMANA`, then `recalculeazaDataSfarsit(curs)` - toate in aceeasi tranzactie, commit atomic
  5. **Dupa commit**: `minioStorageService.deleteFiles(cheiMinio)` bulk (best-effort - log, nu throw)
  6. **Dupa MinIO**: Iterează prin lista `idDocumente` (colectată la pasul 3) și apelează `ragIngestService.stergeDinIngest(docId)` pentru fiecare (best-effort).

  ⚠️ **De ce ordinea DB-first conteaza**: daca faci MinIO delete inainte de DB si DB-ul esueaza, ramai cu randuri in DB care pointeaza spre fisiere inexistente - link-urile de descarcare devin instant rupte, permanent. DB-first + MinIO best-effort inseamna: daca DB commit esueaza → rollback complet, MinIO neatins; daca MinIO esueaza dupa commit → fisiere orfane loghate, DB ramane consistent.

ℹ️ (Opțional, defensiv, nu blocant) Pe frontend, dezactivează butonul "Adaugă săptămână" în timpul request-ului — reduce șansa de dublu-click, deși constrângerea din DB rămâne plasa de siguranță reală, nu asta.

✅ **Verificare**: două request-uri simultane de adăugare săptămână pe același curs (ex. Postman, două tab-uri, trimise cât mai aproape una de alta) → una reușește, cealaltă primește `409` curat, nu o eroare 500 brută. Ștergerea unei săptămâni din mijlocul unui curs (nu ultima) → `400`. Ștergerea ultimei săptămâni (cu sau fără `PARCURS` legat) → dispare din DB (inclusiv `PARCURS`-urile ei), fișierele ei dispar din consola MinIO, ȘI RAG primește apel de ștergere pentru fiecare document.

---

## Etapa 6 — 🤖 AGENT: `RagIngestService`

`service/RagIngestService.java` — apel best-effort, NU blochează fluxul de upload dacă eșuează:

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class RagIngestService {

    private final RestClient.Builder restClientBuilder;

    @Value("${app.rag.base-url}")
    private String ragBaseUrl;

    private RestClient restClient;

    @PostConstruct
    void init() {
        // Construit o singură dată — nu în fiecare apel (restClientBuilder.build() la fiecare request e risipă de resurse)
        this.restClient = restClientBuilder.build();
    }

    public boolean trimiteLaIngest(Document document, Saptamana saptamana, Curs curs) {
        try {
            String path = document.getPathMinio();
            String extensie = (path != null && path.contains(".")) 
                    ? path.substring(path.lastIndexOf(".") + 1).toLowerCase() 
                    : "";

            restClient.post()
                    .uri(ragBaseUrl + "/ingest")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "documentId", document.getId(),
                            "cursId", curs.getId(),
                            "saptamanaId", saptamana.getId(),
                            "profesorId", curs.getProfesor().getId(),
                            "titlu", document.getTitlu(),
                            "pathMinio", path != null ? path : "",
                            "extensie", extensie,
                            "cursDenumire", curs.getDenumire(),
                            "nrSaptamana", saptamana.getNrSaptamana()
                    ))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.error("Eroare la trimiterea documentului {} către RAG: {}", document.getId(), e.getMessage());
            return false;
        }
    }

    /**
     * Anunță RAG să elimine vectorii/embeddings unui document șters sau înlocuit.
     * Best-effort — apelantul NU trebuie să blocheze operațiunea locală dacă asta eșuează.
     */
    public void stergeDinIngest(Long documentId) {
        try {
            restClientBuilder.build().delete()
                    .uri(ragBaseUrl + "/ingest/" + documentId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Eroare la ștergerea documentului {} din RAG: {}", documentId, e.getMessage());
        }
    }
}
```
Folosește `RestClient` (același pattern ca `KeycloakAdminService`), nu `WebClient`/`RestTemplate`.

✅ **Verificare**: cu un endpoint fals/inexistent la `RAG_BASE_URL`, apelul eșuează controlat (returnează `false`, nu aruncă excepție necontrolată mai departe).

---

## Etapa 7 — 🤖 AGENT: `DocumentService` (orchestrare completă)

`service/DocumentService.java`

⚠️ **Regulă obligatorie pentru toată această clasă: NU pune `@Transactional` pe metodele orchestratoare de mai jos** (`adaugaDocument`, `modificaDocument`). Dacă întreaga metodă e învelită într-o singură tranzacție Spring, commit-ul se amână până la finalul metodei — inclusiv după apelul HTTP către RAG. Dacă apelul RAG durează mult sau aruncă excepție, riști fie o conexiune DB ținută inutil de mult, fie (mai grav) un rollback care șterge documentul din DB, exact ce regula 6 din context spune că nu trebuie să se întâmple.

Soluția simplă: un apel simplu `documentRepository.save(document)`, **fără nicio adnotare `@Transactional` în jurul lui în metoda orchestratoare**, e deja el însuși o tranzacție completă și atomică (comportament implicit Spring Data JPA — fiecare metodă de repository e tranzacțională pe cont propriu). Deci ordinea firească de scriere a codului (upload MinIO → save DB → apel RAG → save DB din nou pentru status) garantează deja separarea corectă, atât timp cât nu adaugi tu manual un `@Transactional` care să le înfășoare pe toate.

### `adaugaDocument(Long saptamanaId, Long profesorId, MultipartFile file, String titlu)`
1. Verifică ownership: `Saptamana saptamana = saptamanaRepository.findWithCursAndProfesorById(saptamanaId).orElseThrow()` → extrage `curs` și `profesor`. Verifică dacă `curs.getProfesor().getId().equals(profesorId)` — altfel `AccesInterzisException` (profesorul cursului == profesorId din token)
2. Validează extensia (`pdf`, `docx`, `pptx`, `zip` — case-insensitive) și dimensiunea (deja limitată de `application.properties`, dar o verificare explicită dă un mesaj de eroare mai prietenos decât excepția generică a lui Spring)
3. `path = minioStorageService.uploadFile(file, cursId, saptamanaId)`
4. Creează `Document` (`TITLU`, `PATH_MINIO=path`, `STATUS_INDEX=PRELUAT`, `ACTIV=true`), `documentRepository.save(document)` — commit imediat, own tranzacție
   - ⚠️ Dacă acest `save()` aruncă excepție:
     ```java
     try { documentRepository.save(document); }
     catch (Exception e) {
         minioStorageService.deleteFile(path); // compensare — șterge fișierul orfan din MinIO
         throw e;                              // re-aruncă obligătoriu — nu înghiți excepția!
     }
     ```
5. `boolean succes = ragIngestService.trimiteLaIngest(document, saptamana, curs)` — apel HTTP, în afara oricărei tranzacții
6. `document.setStatusIndex(succes ? TRIMIS : ERONAT)`, `documentRepository.save(document)` — a doua tranzacție, separată, own commit

### `modificaDocument(Long documentId, Long profesorId, String titlu, MultipartFile fisierNou)`
1. Verifică ownership: `Document document = documentRepository.findWithSaptamanaAndCursAndProfesorById(documentId).orElseThrow()` → extrage `saptamana` și `curs`. Verifică dacă `curs.getProfesor().getId().equals(profesorId)` — altfel `AccesInterzisException` (profesorul documentului == profesorId din token)
2. Dacă `fisierNou != null` (înlocuire efectivă — tratează **mai întâi** fișierul, **apoi** titlul):
   - Upload fișier nou (`pathNou`, cheie diferită — UUID nou, nu suprascrie cheia veche)
   - **Abia după** ce upload-ul reușește: `minioStorageService.deleteFile(pathVechi)`, actualizează `PATH_MINIO = pathNou`
   - Resetează `STATUS_INDEX = PRELUAT`, aplică și noul `titlu` dacă e prezent, **un singur** `documentRepository.save(document)` (commit — salvezi titlul și noul path împreună, nu separat)
   - Retrimite la RAG cu conținutul nou (`ragIngestService.trimiteLaIngest(...)`), actualizează `STATUS_INDEX` conform rezultatului, `save()` din nou — aceeași logică de la pașii 5-6 din `adaugaDocument`
   - ℹ️ **Contract UPSERT cu RAG**: endpoint-ul `POST /ingest` efectuează o **suprascriere atomică** (UPSERT) a vectorilor pe baza `documentId`. Nu este necesar un apel explicit `DELETE /ingest/{documentId}` înainte de re-ingest — vectorii vechi sunt înlocuiți direct. Acest lucru elimină o fereastră de eșec inutilă (stergere reușită → re-ingest eșuat = document orfan în DB fără vectori).
3. Dacă **doar** `titlu != null` (fără înlocuire de fișier): actualizează `TITLU`, salvează. Apoi, retrimite documentul la RAG apelând `ragIngestService.trimiteLaIngest(...)` pentru ca chatbot-ul să poată indexa noul titlu în metadatele vectorilor, și actualizează/salvează `STATUS_INDEX` conform rezultatului obținut.

⚠️ **De ce ordinea contează**: dacă salvezi titlul primul (cu `save()`) și upload-ul MinIO eșuează după, documentul are titlul nou dar path-ul vechi (stare inconsistentă). Prin tratarea fișierului **înainte de orice `save()`**, orice eșec la upload lasă DB-ul neatins.

### `stergeDocument(Long documentId, Long profesorId)`
1. `Document document = documentRepository.findWithSaptamanaAndCursAndProfesorById(documentId).orElseThrow()` — același motiv ca la `reincearcaIngest`: relațiile `saptamana.curs.profesor` sunt lazy, metoda nu e `@Transactional`
2. Verifică ownership (profesorul documentului == profesorId din token)
3. Soft-delete: `ACTIV = false`, salvează. Fișierul rămâne în MinIO (regula 4)
4. ⚠️ `ragIngestService.stergeDinIngest(documentId)` — anunță RAG, altfel documentul șters rămâne "viu" în răspunsurile chatbot-ului

### `reincearcaIngest(Long documentId, Long profesorId)`
Endpoint dedicat pentru recuperare manuală fără re-upload.
1. `Document document = documentRepository.findWithSaptamanaAndCursAndProfesorById(documentId).orElseThrow()` — eager loading obligatoriu (metoda nu e `@Transactional`)
2. Verifică ownership (profesorul documentului == profesorId din token)
3. Verifică `STATUS_INDEX == ERONAT` **sau `PRELUAT`** — ambele sunt stadi recuperabile:
   - `ERONAT`: apelul RAG a eșuat explicit
   - `PRELUAT`: documentul a rămas blocat (ex: aplicația a căzut între `save(PRELUAT)` și apelul către RAG — fără retry pe `PRELUAT`, documentul ar rămâne blocat la nesfarșit)
   - `TRIMIS`: refuz cu `400` — nu are sens să reîncerci ceva deja indexat
4. `boolean succes = ragIngestService.trimiteLaIngest(document, document.getSaptamana(), document.getSaptamana().getCurs())`
5. `document.setStatusIndex(succes ? TRIMIS : ERONAT)`, salvează

✅ **Verificare**: upload document → apare `PRELUAT` → în câteva momente `TRIMIS`/`ERONAT` (în funcție de disponibilitatea RAG). Înlocuire fișier → fișierul vechi dispare din MinIO abia după ce se confirmă noul upload, niciodată invers. Ștergere/înlocuire document → RAG primește apel de `DELETE /ingest/{id}` (verifică în log-urile lor, sau simulează cu un endpoint fals dacă nu-l au încă gata). Document `ERONAT` → apel pe `retry-ingest` → devine `TRIMIS` dacă între timp RAG e disponibil.

ℹ️ **Opțional, nu blocant**: validarea actuală (pasul 2 de la `adaugaDocument`) se bazează doar pe extensia fișierului — un fișier redenumit cu altă extensie ar trece de filtru. Dacă vreți validare mai strictă (inspectare a conținutului real, nu doar a numelui), adăugați `org.apache.tika:tika-core` și verificați tipul detectat de Tika contra extensiei declarate, înainte de upload-ul în MinIO. Nu e urgent pentru scara proiectului vostru — fișierele stau ca blob-uri în MinIO, nu se execută nimic pe partea voastră — dar e o îmbunătățire ieftină de adăugat oricând.

ℹ️ **Decizie deliberată, nu omisiune**: fișierele soft-deleted (`ACTIV=false`) rămân în MinIO la nesfârșit — nu există curățare automată. Intenționat: o ștergere automată programată (ex. după 30 de zile) ar contrazice chiar motivul pentru care ați ales soft-delete (reversibilitate). Dacă vreodată devine o problemă reală de spațiu (puțin probabil la scara proiectului), e o decizie de retenție a datelor de discutat explicit cu coordonatorul, nu un patch tehnic de adăugat reactiv.

---

## Etapa 8 — 🤖 AGENT: DTOs + Controllere

### DTOs (`dto/`, records, ca restul proiectului)

Toate DTO-urile de request trebuie adnotate cu constrangeri de validare și controllerul trebuie să folosească `@Valid` — fără ele, un request cu `denumire: ""` va eșua cu eroare SQL brută, nu cu `400` prietenos:

- `CursRequestDto(@NotBlank @Size(max=150) String denumire, @Size(max=1000) String descriere, LocalDate dataInceput)`
- `SaptamanaRequestDto(@Size(max=500) String descriere)` — `descriere` e nullable în DB, dar limita de caractere trebuie respectată

DTO-uri de response:
- `CursResponseDto(Long id, String denumire, String descriere, LocalDate dataInceput, LocalDate dataSfarsit, boolean activ, int nrSaptamaniCurente)` — `nrSaptamaniCurente` se populează în service cu `saptamanaRepository.countByCursId(curs.getId())`
- `SaptamanaResponseDto(Long id, Integer nrSaptamana, String descriere)`
- `DocumentResponseDto(Long id, String titlu, String statusIndex, boolean activ, String urlDescarcare)` — `urlDescarcare` = presigned URL generat la citire; `statusIndex` = string (valoarea enum-ului ca text)

### Controllere (`controller/`) — Reguli de Securitate și Roluri:

> [!IMPORTANT]
> Toate controllerele de mai jos (`CursProfesorController`, `SaptamanaProfesorController`, `DocumentProfesorController`) sunt adnotate la nivel de clasă cu:
> `@PreAuthorize("hasAnyRole('PROFESOR', 'ADMIN')")`
> pentru a permite și administratorului să acceseze fluxurile de citire (read-only).
> 
> Toate metodele de modificare (`POST`, `PUT`, `DELETE`, `PATCH`, `retry-ingest` etc.) din aceste controllere sunt protejate explicit la nivel de metodă cu:
> `@PreAuthorize("hasRole('PROFESOR')")`
> garantând astfel că adminul are acces **strict read-only**, iar modificările pot fi făcute doar de profesori pe propriile resurse.

> [!CAUTION]
> **Niciodată entitate JPA brută în response body.** Returnează exclusiv DTO-uri din controllere. Dacă returnezi `Curs`, `Saptamana` sau `Document` direct, Jackson încearcă să serializeze toate relațiile lazy → fie `LazyInitializationException` (cu `open-in-view=false`), fie **recursie infinită** (`Curs → List<Saptamana> → Curs → ...`). Ambele apar ca `500` la runtime, nu la compilare.

> [!NOTE]
> **Despre "după commit" în `stergeUltimaSaptamana`**: în Spring, o metodă `@Transactional` face commit abia la return — MinIO și RAG sunt apelate tehnic *înainte* de commit. Practic nu contează: `deleteFiles` și `stergeDinIngest` sunt `try/catch` total (best-effort), deci nu pot rollback-ui tranzacția. Dacă vrei garanție strictă "after commit", folosești `TransactionSynchronizationManager.registerSynchronization(afterCommit {...})` — complexitate inutilă la scala proiectului.


În plus, se va adăuga un endpoint nou în `AdminController` pentru vizualizarea globală a tuturor cursurilor:
`AdminController` — `@RequestMapping("/api/admin")`:
- `GET /cursuri` — returnează `List<CursResponseDto>` apelând `cursService.listaToateCursurile()`. Permite adminului să obțină lista completă a cursurilor din platformă.

`CursProfesorController` — `@RequestMapping("/api/profesor/cursuri")`:
- `GET /` — returnează `List<CursResponseDto>`
- `GET /{id}` — returnează `CursResponseDto` (necesar pentru UI-ul de editare fără re-apelul listei complete)
- `POST /` — returnează `CursResponseDto` al cursului creat (201 Created)
- `PUT /{id}` — returnează `CursResponseDto` actualizat (UI nu mai face request separat de refresh)
- `POST /{id}/dezactiveaza` — returnează `ActionResponseDto` (200 silențios dacă deja dezactivat)
- `POST /{id}/activeaza` — returnează `ActionResponseDto` (200 silențios dacă deja activ)

`SaptamanaProfesorController` — `@RequestMapping("/api/profesor")`:
- `GET /cursuri/{cursId}/saptamani`, `POST /cursuri/{cursId}/saptamani`, `PUT /saptamani/{id}`, `DELETE /saptamani/{id}`

`DocumentProfesorController` — `@RequestMapping("/api/profesor")`:
- `GET /saptamani/{saptamanaId}/documente`
- `POST /saptamani/{saptamanaId}/documente` — `multipart/form-data`, câmpuri: `file` (fișierul), `titlu` (string)
- `PUT /documente/{id}` — `multipart/form-data`, `titlu` opțional, `file` opțional (dacă absent, nu se atinge fișierul)
- `DELETE /documente/{id}`
- `POST /documente/{id}/retry-ingest` — reîncearcă trimiterea către RAG pentru un document `ERONAT`

Extrage `profesorId` peste tot la fel ca în `AuthController`/`MeController`: din `@AuthenticationPrincipal OidcUser`, `sub` → `userRepository.findByIdKeycloak(sub).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED))` → `.getId()`.

⚠️ Nu folosi `.get()` fără `.orElseThrow()` — dacă tokenul e valid Keycloak dar userul nu există în DB (caz de margine după un reset al DB-ului fără reset Keycloak), `findByIdKeycloak` întoarce `Optional.empty()` și `.getId()` aruncă `NullPointerException` necontrolat, care ajunge la frontend ca `500` fără context.

✅ **Verificare finală**: flux complet — creare curs (fără dată) → adăugare săptămână (dată rămâne `NULL`) → upload document PDF → apare `TRIMIS`/`ERONAT` → dezactivare curs cu un student înscris de test → `USER_CURS` devine inactiv → reactivare → redevine activ → ștergere ultimă săptămână → documentele și fișierele ei dispar complet (DB + MinIO).

