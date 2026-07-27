# Plan Implementare: Keycloak, Register nativ + Complete-Profile, Login (Spring Boot + React, arhitectură BFF)

## Cum se folosește acest plan

Dă agentului **câte o Etapă odată**, nu tot fișierul. Verifică rezultatul înainte să treci mai departe. Fiecare etapă e marcată:
- 🖱️ **MANUAL** — faci tu, prin consola web Keycloak sau fișiere de temă (un agent de cod nu poate da click prin UI, iar fișierele de temă sunt scrise o singură dată, nu generate repetitiv)
- 🤖 **AGENT** — dai secțiunea unui agent AI de cod

**Presupuneri**: React cu Vite (JS simplu), Maven, package Java `com.example.akadion`, realm Keycloak `Akadion`.

⚠️ **Notă importantă despre temă**: nu poți pune componente React literal în paginile Keycloak — Keycloak randează acele pagini server-side, prin propriul sistem de teme (HTML/CSS/FreeMarker). Rezultatul final poate arăta identic cu restul aplicației (aceleași culori/fonturi/layout), doar tehnic e alt motor de randare în spate.

---

## Context arhitectural (citește / dă-i asta agentului înainte de Etapa 1)

### Fluxul complet (nou)

```
1. User apasă "Înregistrare" în React → redirect către Keycloak (pagină cu temă custom)
2. User completează email + parolă direct în Keycloak (parola NU atinge backend-ul vostru)
3. Keycloak creează contul, îl autentifică automat, redirecționează către backend (același callback ca la login normal)
4. Backend detectează: sesiune nouă, dar NU există rând USER pentru acest sub → creează un rând USER "schelet"
   (ID_KEYCLOAK, MAIL completate; NUME/PRENUME/FACULTATE/ID_ROL = NULL; STARE_CONT = INCOMPLET)
   → redirecționează către /complete-profile (React)
5. User completează NUME/PRENUME/FACULTATE/ROL dorit → UPDATE rândul existent, STARE_CONT = PENDING
6. Cererea apare la admin → Acceptă / Respinge
   - Acceptă: STARE_CONT = ACTIV (operație pură de DB — rolul e deja acolo din pasul 5, Keycloak nu stochează rol deloc)
   - Respinge: STARE_CONT = RESPINS. Contul Keycloak NU se atinge — rămâne funcțional
7. Dacă userul RESPINS se loghează din nou (contul Keycloak tot funcționează): vede o pagină "cererea a fost respinsă" (contul este blocat pentru re-completare în acest flux).
```

### Decizii de arhitectură

- **BFF**: frontend-ul nu vorbește niciodată direct cu Keycloak — orice redirect trece prin backend
- Doi clienți Keycloak, `confidential`: `backend-login` (login + register, autentificare useri) și `backend-admin-api` (service account, operațiuni admin)
- Sesiuni in-memory (fără Redis, o singură instanță de backend)
- CSRF activat compatibil cu SPA (`csrf.spa()` + `CsrfCookieFilter` pentru deferred-token)
- Proxy Vite în dev (elimină CORS/cross-origin complet, cod frontend cu URL-uri relative)
- ⚠️ **Principiu KISS (decizie coordonator)**: Keycloak stochează **doar identitate minimă** — email + parolă, atât. NU stochează rol, NU stochează nume/prenume. DB (`APP_USER`) e singura sursă de adevăr pentru absolut tot ce ține de business — rol, nume, prenume, facultate, stare cont. Backend-ul nu citește niciodată `firstName`/`lastName` `/rol` din tokenul Keycloak; `CustomAuthoritiesMapper` (Etapa 2.1) construiește autoritățile exclusiv din `ID_ROL` din DB și doar dacă contul este `ACTIV`. Consecință directă: nu mai există niciun apel Keycloak legat de rol nicăieri în plan (nici creare roluri de realm, nici atribuire la accept) — vezi Etapa 5.

### Schema DB (actualizată pentru noul flux)

```
ROL
* ID
* DENUMIRE          -- 'ADMIN' | 'PROFESOR' | 'STUDENT'

STARE_CONT
* ID
* DENUMIRE          -- 'INCOMPLET' | 'PENDING' | 'ACTIV' | 'INACTIV' | 'RESPINS'
                        -- INCOMPLET = nou, cont Keycloak creat, profil neincomplet

APP_USER              -- "USER" e cuvânt rezervat în Postgres, folosim alt nume de tabelă
* ID
* ID_KEYCLOAK        -- ⚠️ acum NOT NULL + UNIQUE de la register (nu mai e nullable până la acceptare)
* ID_STARE_CONT       -- FK -> STARE_CONT, NOT NULL
* ID_ROL              -- ⚠️ acum NULLABLE (completat abia la Complete-Profile, nu la register)
* NUME                -- ⚠️ NULLABLE
* PRENUME             -- ⚠️ NULLABLE
* MAIL                -- din Keycloak, la register; UNIQUE (Keycloak deja impune unicitatea nativ)
* FACULTATE           -- ⚠️ NULLABLE
* NR_RESPINGERI        -- opțional, contor incrementat la fiecare respingere (înlocuiește vechea logică de numărare a rândurilor RESPINS, care nu mai are sens — acum există un singur rând per persoană)
* CREATED_BY, CREATED_DATE, LAST_MODIFIED_BY, LAST_MODIFIED_DATE -- (din BaseAuditableEntity, completate prin AuditConfig și OidcUser)
```

⚠️ **Ce dispare față de planul anterior**: toată logica de "MAIL fără UNIQUE strict, verificare aplicativă de duplicate, index parțial, resubmitere ca INSERT nou" (fosta §3c/§3d) — devine inutilă. Acum există **exact un rând `APP_USER` per identitate Keycloak**, creat o singură dată la primul login/register și actualizat ulterior (niciodată un al doilea `INSERT` pentru aceeași persoană). `MAIL` poate fi `UNIQUE` strict în DB fără nicio grijă, fiindcă Keycloak deja garantează unicitatea la register, înainte ca rândul din DB să existe măcar.

---

## Etapa 0 — 🖱️ MANUAL: Configurare Keycloak (rulare locală)

1. Pornește Keycloak: `bin/kc.sh start-dev` (sau `.bat` pe Windows) → `http://localhost:8080`

2. Autentifică-te în Admin Console, creează realm-ul `Akadion`

3. **Activează auto-înregistrarea**: Realm settings → tab **Login** → `User registration` = **ON**. Tot aici, `Email as username` = **ON** — face ca username-ul să devină automat identic cu email-ul, deci nu mai apare separat pe formulare ca un câmp în plus de completat.

4. **Curăță User Profile** (Realm settings → tab **User profile**), aliniat cu principiul KISS (Keycloak stochează doar identitate minimă): păstrează `email` (rămâne obligatoriu), **șterge** `firstName` și `lastName` din listă. `username` nu se șterge (e conceptul fundamental de identitate al lui Keycloak, nu un atribut obișnuit) — dar cu `Email as username` activat la pasul anterior, nu mai apare separat pe formularul de register oricum.

⚠️ Verifică după acest pas: pagina de register (o poți accesa direct, vezi Etapa 2.2 pentru URL) ar trebui să ceară acum doar email + parolă, nimic altceva.

5. **Creează clientul `backend-login`** — la pasul "Capability config" din wizard, setează exact:
   - Client authentication: **On**
   - Authorization: Off
   - Standard flow: **On**
   - Direct access grants: **Off** ⚠️ (Keycloak îl pornește implicit la creare — dați-l jos; e grant-ul deprecat "user+parolă direct către Keycloak", ocolește complet fluxul Authorization Code pe care îl folosim)
   - Implicit flow: Off
   - Service accounts roles: Off (e treaba celuilalt client)
   - Standard Token Exchange / OAuth 2.0 Device Authorization Grant / OIDC CIBA Grant: Off (toate)
   - PKCE Method: **S256** ⚠️ (implicit e "Choose..." = fără PKCE — trebuie ales explicit, e recomandarea din context arhitectural, de aici se activează efectiv)
   - Apoi, la pasul următor al wizard-ului: Valid redirect URIs: `http://localhost:8081/login/oauth2/code/keycloak` și `http://localhost:5173/*`; Web origins: `http://localhost:8081`
   - Copiază `client secret` din tab-ul Credentials (după ce clientul e creat)

6. **Creează clientul `backend-admin-api`** — la "Capability config":
   - Client authentication: **On**
   - Authorization: Off
   - Standard flow: **Off** (acest client nu face niciodată login de user cu redirect în browser)
   - Direct access grants / Implicit flow: Off
   - Service accounts roles: **On** ⚠️ (singurul important pentru el — activează grant-ul `client_credentials`)
   - Restul (Token Exchange, Device Authorization, CIBA): Off
   - PKCE Method: nu contează, lasă "Choose..." (nu se aplică fără Standard flow)
   - Tab Service accounts roles → Assign role → din `realm-management` → `manage-users`, `view-users`
   - Copiază `client secret`

7. **Configurează SMTP** pentru realm (Realm settings → Email) — necesar pentru email-uri native Keycloak (confirmare cont, resetare parolă uitată). Pentru local: Mailtrap sau MailHog.

8. ⚠️ **Creează manual primul admin** (Users → Add user, la fel ca înainte — bootstrap-ul de admin nu trece prin fluxul normal, fiindcă n-ar exista cine să-l accepte):
   - Email, tab Credentials → parolă (debifează Temporary)
   - Copiază `ID`-ul userului — ai nevoie de el la Etapa 1.7 (rolul `ADMIN` se atribuie **doar în DB**, prin scriptul de bootstrap, nu în Keycloak)

✅ **Verificare Etapa 0**: `http://localhost:8080/realms/Akadion/.well-known/openid-configuration` răspunde cu JSON.

---

## Etapa 0.9 — 🖱️ MANUAL: Temă custom Keycloak pentru pagina de Register

Nu se dă unui agent de cod ca task repetitiv — se scrie o singură dată, HTML/CSS static, ideal chiar de voi (sau agentul poate genera fișierele o dată, ca orice alt fișier static).

1. În folderul unde ai descărcat Keycloak: `themes/akadion-theme/login/`

2. ⚠️ Numele exact al fișierului de template pentru register **diferă în funcție de versiunea Keycloak** (versiunile recente folosesc `register-user-profile.ftl`, versiuni mai vechi `register.ftl`) — verifică în `themes/keycloak/login/` (tema implicită, `base`/`keycloak`) care fișier există acolo și copiază-l ca punct de plecare, nu porni de la zero.

3. Copiază și `theme.properties` din tema `keycloak` de bază, ajustează `parent=keycloak` (moștenește restul paginilor — login, resetare parolă etc. — nemodificate, doar `register` e suprascris)

4. Editează template-ul copiat + adaugă un `resources/css/styles.css` propriu — culori/fonturi/layout identice cu React-ul vostru (odată ce aveți o paletă de culori stabilită în frontend, refolosiți aceleași valori aici, ca experiența să pară continuă)

ℹ️ Dacă ai făcut deja curățenia din Etapa 0 (User Profile fără `firstName`/`lastName`, `Email as username` ON), template-ul copiat la pasul 2 ar trebui să randeze deja doar câmpurile email + parolă, automat — nu mai e nimic de editat suplimentar aici pe partea de câmpuri, doar stilul (CSS).

5. Realm settings → tab **Themes** → `Login theme` = `akadion-theme`

✅ **Verificare Etapa 0.9**: accesând link-ul de register (vezi Etapa 2.2 pentru cum se construiește), pagina arată cu tema voastră, nu cu aspectul implicit Keycloak.

---

## Etapa 1 — 🤖 AGENT: Schema DB + configurare proiect

### 1.1 `backend/pom.xml`
Dependențe: `spring-boot-starter-web`, `spring-boot-starter-oauth2-client`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `org.postgresql:postgresql`, `org.projectlombok:lombok`, `org.mapstruct:mapstruct`.
Configurare procesare adnotări în plugin-ul `maven-compiler-plugin`: `lombok`, `mapstruct-processor` și `lombok-mapstruct-binding`.

### 1.2 `backend/src/main/resources/application.properties`
```properties
spring.application.name=akadion
server.port=8081

# --- DataSource ---
spring.datasource.url=jdbc:postgresql://localhost:5432/akadion
spring.datasource.username=myuser
spring.datasource.password=${DB_PASSWORD}

# --- JPA / Hibernate ---
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
spring.jpa.show-sql=true

# --- Flyway ---
# spring.flyway.enabled=true # Decomentează ulterior când vei folosi migrații

# --- OAuth2 Client (BFF pattern) ---
spring.security.oauth2.client.registration.keycloak.client-id=backend-login
spring.security.oauth2.client.registration.keycloak.client-secret=${KEYCLOAK_BACKEND_LOGIN_SECRET}
spring.security.oauth2.client.registration.keycloak.authorization-grant-type=authorization_code
spring.security.oauth2.client.registration.keycloak.scope=openid,profile,email
spring.security.oauth2.client.registration.keycloak.provider=keycloak

spring.security.oauth2.client.registration.keycloak-register.client-id=backend-login
spring.security.oauth2.client.registration.keycloak-register.client-secret=${KEYCLOAK_BACKEND_LOGIN_SECRET}
spring.security.oauth2.client.registration.keycloak-register.authorization-grant-type=authorization_code
spring.security.oauth2.client.registration.keycloak-register.scope=openid,profile,email
spring.security.oauth2.client.registration.keycloak-register.provider=keycloak

spring.security.oauth2.client.registration.keycloak-admin.client-id=backend-admin-api
spring.security.oauth2.client.registration.keycloak-admin.client-secret=${KEYCLOAK_ADMIN_API_SECRET}
spring.security.oauth2.client.registration.keycloak-admin.authorization-grant-type=client_credentials
spring.security.oauth2.client.registration.keycloak-admin.provider=keycloak

spring.security.oauth2.client.provider.keycloak.issuer-uri=http://localhost:8080/realms/Akadion

app.keycloak.realm=Akadion
app.keycloak.base-url=http://localhost:8080
app.frontend.base-url=http://localhost:5173
```
⚠️ Observă `keycloak-register` — o **înregistrare duplicată** a lui `keycloak-login` (același `client-id`/`client-secret`), sub alt nume. Motiv tehnic: rezolvatorul implicit al Spring Security identifică înregistrarea după ultimul segment din URL (`/oauth2/authorization/{id}`) — ca `/oauth2/authorization/keycloak-register` să găsească o configurație validă de pornit, avem nevoie de o intrare cu exact acel nume. Comportamentul diferit (redirect spre `/registrations` în loc de `/auth`) se face separat, în Etapa 2.2.

### 1.3 `application-local.properties.example` + `.gitignore`
Ca înainte — fișier exemplu fără secrete, cel real necomis.

### 1.4 Entități JPA — `backend/src/main/java/com/example/akadion/entity/`
- `Rol.java` (Entitatea ce mapează tabela `roluri`):
```java
@Entity
@Table(name = "roluri")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Rol {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String denumire;
}
```
- `StareCont.java` (Entitatea ce mapează tabela `stari_cont`):
```java
@Entity
@Table(name = "stari_cont")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class StareCont {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String denumire;
}
```
- `User.java` — `@Table(name = "app_user")` (cuvânt rezervat Postgres). Câmpuri: `ID`, `IdKeycloak` (⚠️ acum `nullable = false, unique = true`), `StareCont` (`@ManyToOne`, `NOT NULL`), `Rol` (`@ManyToOne`, ⚠️ **acum nullable**), `NUME`/`PRENUME`/`FACULTATE` (⚠️ **acum nullable**), `MAIL` (`unique = true` — acum sigur, vezi contextul arhitectural), `NrRespingeri` (Integer, default 0, opțional)

### 1.4.1 Audit (JPA Auditing)
- `AuditConfig.java` implementează `AuditorAware<String>` care extrage UUID-ul (`sub`) din `OidcUser` (din `SecurityContextHolder`). Fallback la `"system"` pentru acțiuni fără user.
- Înregistrează și `@EnableJpaAuditing(auditorAwareRef = "auditorProvider", dateTimeProviderRef = "auditingDateTimeProvider")` cu un `DateTimeProvider` care oferă `OffsetDateTime.now()`.
- Toate entitățile extind `BaseAuditableEntity`.

### 1.5 Repository-uri
- `RolRepository`, `StareContRepository` — `findByDenumire(String)`
- `UserRepository` — `findByIdKeycloak(String)`, `findByMail(String)` și `findByStareCont_Denumire(String)` adnotate cu `@EntityGraph(attributePaths = {"rol", "stareCont"})` pentru prevenirea problemei N+1 select.

### 1.6 Seed date inițiale — `DataSeeder.java`
`CommandLineRunner`, la pornire, dacă `ROL`/`STARE_CONT` sunt goale, inserează:
- `ROL`: `ADMIN`, `PROFESOR`, `STUDENT`
- `STARE_CONT`: `INCOMPLET`, `PENDING`, `ACTIV`, `INACTIV`, `RESPINS`

### 1.7 — 🖱️ MANUAL: Bootstrap primul admin în DB

La fel ca înainte — script separat, nu în `DataSeeder` (UUID diferit per persoană din echipă).

`backend/scripts/bootstrap-admin.sql` (șablon, comis fără valori reale completate):
```sql
INSERT INTO app_user (id_keycloak, id_stare_cont, id_rol, nume, prenume, mail, facultate)
SELECT '<UUID_KEYCLOAK>',
       (SELECT id FROM stare_cont WHERE denumire = 'ACTIV'),
       (SELECT id FROM rol WHERE denumire = 'ADMIN'),
       'Admin', 'Principal', '<EMAIL_ADMIN>', NULL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE mail = '<EMAIL_ADMIN>');
```

✅ **Verificare Etapa 1**: aplicația pornește, `ROL` are 3 rânduri, `STARE_CONT` are 5. După rularea §1.7, `APP_USER` are un rând `ACTIV`/`ADMIN`.

---

## Etapa 2 — 🤖 AGENT: Spring Security (BFF, CSRF, roluri, redirect register)

Implementează `GrantedAuthoritiesMapper`. Extrage UUID-ul (`sub`) din `OidcUserAuthority`, caută utilizatorul corespunzător în baza de date locală (`app_user`) și îi atribuie autoritatea Spring Security prefixată cu `ROLE_` (de ex: `ROLE_STUDENT` sau `ROLE_PROFESOR`). În cazul în care starea contului este `INCOMPLET` (utilizatorul nou înregistrat nu are încă rol), returnează o listă goală de autorități fără a bloca autentificarea.
```java
@Slf4j
@Component
@RequiredArgsConstructor
public class CustomAuthoritiesMapper implements GrantedAuthoritiesMapper {

    private final UserRepository userRepository;

    private static final String ACTIVE_STATE = "ACTIV";

    @Override
    public Collection<? extends GrantedAuthority> mapAuthorities(
            Collection<? extends GrantedAuthority> authorities) {

        Optional<OidcUserAuthority> oidcUserAuthority = authorities.stream()
                .filter(OidcUserAuthority.class::isInstance)
                .map(OidcUserAuthority.class::cast)
                .findFirst();

        if (oidcUserAuthority.isEmpty()) {
            return List.of();
        }

        String sub = oidcUserAuthority.get().getIdToken().getSubject();

        return userRepository.findByIdKeycloak(sub)
                .map(user -> {
                    if (user.getStareCont() == null || user.getStareCont().getDenumire() == null) {
                        log.warn("User cu sub={} are stare_cont lipsă în DB.", sub);
                        return (Collection<? extends GrantedAuthority>) List.<GrantedAuthority>of();
                    }

                    String stareCont = user.getStareCont().getDenumire().trim().toUpperCase(Locale.ROOT);
                    if (!ACTIVE_STATE.equals(stareCont)) {
                        log.debug("Userul cu sub={} are starea {}. Fără autorități de business.", sub, stareCont);
                        return (Collection<? extends GrantedAuthority>) List.<GrantedAuthority>of();
                    }

                    if (user.getRol() == null || user.getRol().getDenumire() == null || user.getRol().getDenumire().isBlank()) {
                        log.warn("Userul cu sub={} este ACTIV dar nu are rol valid în DB.", sub);
                        return (Collection<? extends GrantedAuthority>) List.<GrantedAuthority>of();
                    }

                    String roleDenumire = normalizeRoleName(user.getRol().getDenumire());
                    if (roleDenumire == null) {
                        log.warn("Rol invalid '{}' pentru sub={}.", user.getRol().getDenumire(), sub);
                        return (Collection<? extends GrantedAuthority>) List.<GrantedAuthority>of();
                    }

                    log.debug("Mapare rol din DB pentru sub={}: ROLE_{}", sub, roleDenumire);
                    return (Collection<? extends GrantedAuthority>)
                            List.<GrantedAuthority>of(new SimpleGrantedAuthority("ROLE_" + roleDenumire));
                })
                .orElseGet(() -> {
                    log.warn("User cu sub={} autentificat în Keycloak dar negăsit încă în DB.", sub);
                    return List.of();
                });
    }

    private String normalizeRoleName(String roleDenumire) {
        if (roleDenumire == null) return null;
        String normalized = roleDenumire.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) return null;
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        return normalized.isBlank() ? null : normalized;
    }
}
```

### 2.2 `CustomAuthorizationRequestResolver.java`

⚠️ Piesă nouă, esențială pentru fluxul de register. Implementează `OAuth2AuthorizationRequestResolver`:

Adăugat explicit PKCE `S256` prin `setAuthorizationRequestCustomizer` (Keycloak o cere pe clientul nostru).

```java
public class CustomAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {
    private static final String REGISTRATION_PATH = "/oauth2/authorization";
    private static final String REGISTER_REGISTRATION_ID = "keycloak-register";

    private final OAuth2AuthorizationRequestResolver defaultResolver;

    public CustomAuthorizationRequestResolver(ClientRegistrationRepository repo) {
        DefaultOAuth2AuthorizationRequestResolver resolver = new DefaultOAuth2AuthorizationRequestResolver(repo, REGISTRATION_PATH);
        resolver.setAuthorizationRequestCustomizer(org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers.withPkce());
        this.defaultResolver = resolver;
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return customize(defaultResolver.resolve(request), requestRegistrationId(request));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String registrationId) {
        return customize(defaultResolver.resolve(request, registrationId), registrationId);
    }

    private OAuth2AuthorizationRequest customize(OAuth2AuthorizationRequest req, String registrationId) {
        if (req == null) return null;
        if (REGISTER_REGISTRATION_ID.equals(registrationId)) {
            return OAuth2AuthorizationRequest.from(req)
                    .additionalParameters(params -> params.put("prompt", "create"))
                    .build();
        }
        return req;
    }

    private String requestRegistrationId(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String prefix = REGISTRATION_PATH + "/";
        return uri.startsWith(prefix) ? uri.substring(prefix.length()) : null;
    }
}
```
Efect: `GET /oauth2/authorization/keycloak` → pagina normală de login Keycloak. `GET /oauth2/authorization/keycloak-register` → aceeași configurație de client, dar redirecționează spre `/protocol/openid-connect/registrations` (endpoint-ul Keycloak dedicat direct paginii de register, cu tema voastră custom de la Etapa 0.9) în loc de `/auth`.

### 2.3 `CsrfCookieFilter.java`
Acest filtru forțează rezolvarea token-ului CSRF "leneș" (deferred) la fiecare request, scriind cookie-ul `XSRF-TOKEN` în răspunsul HTTP, asigurându-se astfel că frontend-ul îl primește și îl poate trimite înapoi la POST/PUT request-uri:
```java
public class CsrfCookieFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute("_csrf");
        if (csrfToken != null) {
            csrfToken.getToken(); // Apelul getToken() forțează rezolvarea și scrie cookie-ul XSRF-TOKEN
        }
        filterChain.doFilter(request, response);
    }
}
```

### 2.4 `SecurityConfig.java`
- `.oauth2Login(oauth2 -> oauth2
    .authorizationEndpoint(ep -> ep.authorizationRequestResolver(new CustomAuthorizationRequestResolver(clientRegistrationRepository)))
    .userInfoEndpoint(ui -> ui.userAuthoritiesMapper(customAuthoritiesMapper))
  )`
- CSRF este activat prin `.csrf(csrf -> csrf.spa())`.
- `permitAll` pe `/error`, `/actuator/health`, `/oauth2/**`, `/login/**`. Restul endpoint-urilor necesită autentificare.
- Securizare API cu entry point custom `HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)` pe `/api/**` și `AccessDeniedHandler` custom (`jsonAccessDeniedHandler`).
- Logout-ul invalidează sesiunea și șterge cookie-urile `JSESSIONID` și `XSRF-TOKEN`.

### 2.5 `CorsConfig.java`
Configurare CORS pentru a permite apelurile venite din frontend-ul React local, inclusiv transmiterea cookie-urilor de sesiune și header-ului CSRF:
```java
@Configuration
public class CorsConfig {
    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(List.of(frontendBaseUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "Authorization"));
        config.setExposedHeaders(List.of("Location"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

✅ **Verificare Etapa 2**: `http://localhost:8081/oauth2/authorization/keycloak` → login Keycloak normal. `http://localhost:8081/oauth2/authorization/keycloak-register` → pagina de **register** Keycloak (cu tema de la 0.9, dacă e gata; altfel aspectul implicit, dar funcțional).

---

## Etapa 3 — 🤖 AGENT: Bootstrap USER la primul login/register + redirect diferențiat

### 3.1 `CustomAuthenticationSuccessHandler.java`

Implementează `AuthenticationSuccessHandler`. La orice autentificare reușită (login SAU register):

1. Extrage `sub` și `email` din `Authentication` (`OidcUser`)
2. Validează email-ul primit din token (normalizat la litere mici).
3. `SELECT` `User` după `ID_KEYCLOAK = sub`.
4. **Dacă NU există** → primul login după register: verifică dacă emailul nu este deja folosit în baza de date locală (aruncă `ForbiddenOperationException` dacă este duplicat). Creează rândul nou cu starea `INCOMPLET` și redirecționează către `{frontend}/complete-profile`.
5. **Dacă există**, redirecționează în funcție de `STARE_CONT`:
   - `INCOMPLET` → `{frontend}/complete-profile` (a început, dar n-a terminat data trecută)
   - `PENDING` → `{frontend}/asteptare-aprobare`
   - `RESPINS` → `{frontend}/cerere-respinsa`
   - `INACTIV` → `{frontend}/cont-dezactivat`
   - `ACTIV` → `{frontend}/` (aplicația normală)

### 3.2 `StareContFilter.java` — actualizat

Regulă nouă, mai nuanțată decât înainte (nu mai e doar "blochează dacă nu ACTIV"):
1. Neautentificat → trece mai departe
2. Autentificat, `User` inexistent în DB → tratează ca eroare, `403`
3. Autentificat, `STARE_CONT = INCOMPLET` → permite **doar** `POST /api/auth/complete-profile` și `GET /api/auth/me`; orice alt endpoint → `403`
4. Autentificat, `STARE_CONT = PENDING` → permite doar `GET /api/auth/me`; restul → `403`
5. Autentificat, `STARE_CONT = RESPINS` → blochează accesul cu `403` (la fel ca în codul curent, resubmisia directă nu mai este permisă în acest flux de complete-profile).
6. Autentificat, `STARE_CONT = INACTIV` → doar `GET /api/auth/me`; restul → `403`
7. Autentificat, `STARE_CONT = ACTIV` → trece liber
8. Excepții by-pass la filtru pentru rutele `/error`, `/actuator/**` și `/logout` (GET/POST).

### 3.3 `MeController.java` — `GET /api/auth/me`
Returnează datele de identificare și starea contului utilizatorului curent din baza de date locală pe baza principalului `OidcUser`:
```java
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class MeController {
    private final UserRepository userRepository;

    @GetMapping("/me")
    public UserMeDto me(@AuthenticationPrincipal OidcUser oidcUser) {
        String sub = oidcUser.getSubject();
        return userRepository.findByIdKeycloak(sub)
                .map(user -> new UserMeDto(
                        user.getId(),
                        user.getNume(),
                        user.getPrenume(),
                        user.getMail(),
                        user.getRol() != null ? user.getRol().getDenumire() : null,
                        user.getStareCont().getDenumire()
                ))
                .orElseThrow(() -> new UserNotFoundException(0L));
    }
}
```

✅ **Verificare Etapa 3**: register nou prin `/oauth2/authorization/keycloak-register` → după completare pe pagina Keycloak, ajungi automat autentificat, cu un rând `APP_USER` nou (`STARE_CONT = INCOMPLET`) creat în DB.

---

## Etapa 4 — 🤖 AGENT: Complete-Profile

### 4.1 `CompleteProfileRequestDto.java`
`nume`, `prenume`, `facultate`, `rolDorit` (validat: `PROFESOR` sau `STUDENT`, NU `ADMIN`)

### 4.2 `CompleteProfileService.java`
Metodă `completeaza(String subKeycloak, String email, CompleteProfileRequestDto dto)` care returnează `CompleteProfileResponseDto`:
1. `SELECT User WHERE ID_KEYCLOAK = subKeycloak`
2. Validează că starea curentă este exact `INCOMPLET` (altfel aruncă `InvalidUserStateException`).
3. Verifică să nu existe alt utilizator cu aceeași adresă de email de încredere în DB-ul local.
4. Actualizează utilizatorul cu datele trimise în formular, setează `stareCont = PENDING` și salvează în DB.

### 4.3 `AuthController.java` (extins)
`POST /api/auth/complete-profile` — protejat prin autentificare. Preia `sub` și `email` din principalul `OidcUser` și le transmite serviciului, returnând DTO-ul de răspuns.

✅ **Verificare Etapa 4**: completând formularul, `STARE_CONT` devine `PENDING`, câmpurile se populează.

---

## Etapa 5 — 🤖 AGENT: Admin — accept/respinge (simplificat major, KISS — Keycloak nu mai stochează rol)

### 5.1 `KeycloakAdminService.java`

Dezactivează și reactivează utilizatorii direct în consola Keycloak via Admin API folosind apeluri PUT cu Service Account Client credentials:
```java
@Slf4j
@Service
@RequiredArgsConstructor
public class KeycloakAdminService {
    private final OAuth2AuthorizedClientManager authorizedClientManager;
    private final RestClient.Builder restClientBuilder;

    @Value("${app.keycloak.base-url}")
    private String keycloakBaseUrl;

    @Value("${app.keycloak.realm}")
    private String realm;

    public void dezactiveazaUser(String idKeycloak) {
        updateEnabled(idKeycloak, false);
    }

    public void reactiveazaUser(String idKeycloak) {
        updateEnabled(idKeycloak, true);
    }

    private void updateEnabled(String idKeycloak, boolean enabled) {
        try {
            restClient().put()
                    .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/users/" + idKeycloak)
                    .header("Authorization", "Bearer " + getAdminToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("enabled", enabled))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Keycloak: Contul utilizatorului sub={} a fost setat enabled={}", idKeycloak, enabled);
        } catch (RestClientException e) {
            throw new KeycloakIntegrationException(
                    "Eroare Keycloak la setarea enabled=" + enabled + " pentru sub=" + idKeycloak + ": " + e.getMessage(), e);
        }
    }

    private String getAdminToken() {
        OAuth2AuthorizeRequest authorizeRequest = OAuth2AuthorizeRequest
                .withClientRegistrationId("keycloak-admin")
                .principal("service-account-keycloak-admin")
                .build();
        OAuth2AuthorizedClient authorizedClient = authorizedClientManager.authorize(authorizeRequest);
        if (authorizedClient == null || authorizedClient.getAccessToken() == null) {
            throw new KeycloakIntegrationException(
                    "Nu s-a putut obține token-ul de service-account pentru clientul 'keycloak-admin'");
        }
        return authorizedClient.getAccessToken().getTokenValue();
    }

    private RestClient restClient() {
        return restClientBuilder.build();
    }
}
```

### 5.2 `AdminUserService.java`
- `listaUtilizatori(String stare)`: Dacă `stare = ALL`, rulează `findAll()`. Altfel, filtrează după starea primită. Mapările în `UserPendingDto` includ și câmpul `stare` curent din DB și `createdAt`.
- `approveUser(Long userId)`: ⚠️ **operație DB pură**:
  1. `User` cu `STARE_CONT = PENDING`
  2. Validează că utilizatorul vizat nu are deja rolul de `ADMIN`.
  3. `STARE_CONT = ACTIV`
  4. Returnează `ActionResponseDto`.
- `rejectUser(Long userId)`: `STARE_CONT = RESPINS`, `NR_RESPINGERI += 1`. Keycloak **neatins**. Returnează `ActionResponseDto`.
- `dezactiveazaUser(Long userId)`: Schimbă starea locală a contului în `INACTIV` și dezactivează contul în Keycloak.
- `activeazaUser(Long userId)`: Schimbă starea locală în `ACTIV` și reactivează contul în Keycloak.

### 5.3 `AdminController.java`
Controller protejat la nivel de clasă cu securitatea `@PreAuthorize("hasRole('ADMIN')")`:
```java
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AdminUserService adminUserService;

    @GetMapping("/users")
    public List<UserPendingDto> listaUseri(@RequestParam(defaultValue = "PENDING") String stare) {
        return adminUserService.listaUtilizatori(stare);
    }

    @PatchMapping("/users/{id}/approve")
    public ActionResponseDto approveUser(@PathVariable Long id) {
        return adminUserService.approveUser(id);
    }

    @PatchMapping("/users/{id}/reject")
    public ActionResponseDto rejectUser(@PathVariable Long id) {
        return adminUserService.rejectUser(id);
    }

    @PostMapping("/users/{id}/deactivate")
    public void deactivateUser(@PathVariable Long id) {
        adminUserService.dezactiveazaUser(id);
    }

    @PostMapping("/users/{id}/activate")
    public void activeazaUser(@PathVariable Long id) {
        adminUserService.activeazaUser(id);
    }
}
```

✅ **Verificare Etapa 5**: accept → `STARE_CONT = ACTIV` (verifică doar în DB — Keycloak Users nu arată niciun rol, e normal, nu mai stochează asta). Respinge → `STARE_CONT = RESPINS`, userul tot există și poate loga în Keycloak (dar blocat de filtru, vezi Etapa 3.2).

---
## Etapa 8 — 🤖 AGENT: Date demo pentru evaluare (opțional, profil separat)

Similar cu runda anterioară, dar acum simulează stadiul realist pentru admin: `STARE_CONT = PENDING`, cu `NUME`/`PRENUME`/`FACULTATE`/`ID_ROL` deja completate (ca și cum ar fi trecut deja prin Complete-Profile), `ID_KEYCLOAK` = UUID-uri fictive generate random (nu userii chiar nu există în Keycloak — nu contează, fiindcă demo-ul testează doar panoul admin, nu login-ul acelor conturi). `@Profile("demo")`, dezactivat implicit.

---

## Contractul de Erori REST API (Exception Handling)

Pentru a ajuta frontend-ul React să trateze corect erorile și să afișeze mesaje specifice (sau erori de validare pe input-uri), backend-ul folosește un sistem global de captare a excepțiilor (`GlobalExceptionHandler`). 

Orice eroare aruncată în backend este tradusă într-un răspuns JSON unitar și un cod HTTP standard.

### 1. Formatul standard pentru Erori Generale
Pentru erorile de tip resursă negăsită, stare incompatibilă sau conflict, răspunsul are următoarea structură:

* **Cod HTTP:** 404 (Not Found), 400 (Bad Request), 409 (Conflict), sau 502 (Bad Gateway)
* **JSON:**
```json
{
  "status": 404,
  "eroare": "Mesajul explicativ al erorii, generat de backend."
}
```

#### Maparea Excepțiilor pe coduri HTTP:
* **`UserNotFoundException`** (HTTP 404 Not Found)
  * *Exemplu:* `{"status": 404, "eroare": "Utilizatorul cu id=5 nu a fost găsit."}`
* **`InvalidUserStateException`** (HTTP 400 Bad Request)
  * *Exemplu:* `{"status": 400, "eroare": "Utilizatorul 5 nu are starea PENDING (starea curentă: ACTIV)"}`
* **`KeycloakConflictException`** (HTTP 409 Conflict)
  * *Exemplu:* `{"status": 409, "eroare": "Emailul 'popescu@student.test' există deja direct în Keycloak. Necesită curățare manuală..."}`
* **`KeycloakIntegrationException`** (HTTP 502 Bad Gateway)
  * *Exemplu:* `{"status": 502, "eroare": "Eroare de comunicare cu Keycloak. Verificați logurile și reîncercați.", "detalii": "Connection refused..."}`

---

### 2. Formatul special pentru Erori de Validare Formular (HTTP 400)
Când frontend-ul trimite date de formular care nu respectă validările din Java (de exemplu, la completarea profilului sau înregistrări), eroarea va conține un obiect suplimentar numit `campuri` în care sunt detaliate erorile specifice fiecărui câmp:

* **Cod HTTP:** 400 (Bad Request)
* **JSON:**
```json
{
  "status": 400,
  "eroare": "Date invalide",
  "campuri": {
    "nume": "Numele este obligatoriu",
    "prenume": "Prenumele nu poate fi gol",
    "rolDorit": "Rolul ales trebuie să fie STUDENT sau PROFESOR"
  }
}
```

*Notă pentru React:* Acest obiect `campuri` poate fi citit direct în React (ex: `error.response.data.campuri`) și folosit pentru a afișa mesaje roșii de validare direct sub input-urile corespunzătoare din formular (de exemplu, în `CompleteProfilePage`).

---
