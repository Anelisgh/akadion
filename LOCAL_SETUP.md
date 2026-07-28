# Setup local AKADION


## Endpointuri locale

- PostgreSQL: `localhost:5432`
- Keycloak: `localhost:8080`
- Backend: `localhost:8081`
- Frontend: `localhost:5173`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`
- RAG: `localhost:8000` doar daca serviciul exista

## Variabile necesare

Scriptul `set-local-secrets.ps1` trebuie apelat cu dot sourcing:

```powershell
. .\scripts\set-local-secrets.ps1
```

Variabile cerute:

- `DB_PASSWORD`
- `KEYCLOAK_BACKEND_LOGIN_SECRET`
- `KEYCLOAK_ADMIN_API_SECRET`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

Pentru MinIO, scriptul sincronizeaza in sesiunea curenta si:

- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`

Daca `.env` din radacina contine deja `MINIO_ROOT_USER` si `MINIO_ROOT_PASSWORD`, scriptul le poate reutiliza automat pentru `MINIO_ACCESS_KEY` si `MINIO_SECRET_KEY`.

Exemplu cu parametri:

```powershell
. .\scripts\set-local-secrets.ps1 `
  -DbPassword "INLOCUIESTE_CU_PAROLA_DB" `
  -KeycloakBackendLoginSecret "INLOCUIESTE_CU_SECRET_BACKEND_LOGIN" `
  -KeycloakAdminApiSecret "INLOCUIESTE_CU_SECRET_BACKEND_ADMIN_API" `
  -MinioAccessKey "INLOCUIESTE_CU_MINIO_ACCESS_KEY" `
  -MinioSecretKey "INLOCUIESTE_CU_MINIO_SECRET_KEY"
```

## Ordinea exacta de pornire

Întreaga stivă (PostgreSQL, MinIO, Keycloak, Backend, Frontend) este acum complet containerizată și orchestrată cu Docker Compose.

1. Asigură-te că **Docker Desktop** este pornit.
2. Deschide un terminal în rădăcina proiectului.
3. Opțional: Pentru a folosi secrete proprii, le poți adăuga direct în fișierul `.env` din rădăcină (Docker Compose îl va citi automat). Alternativ, le poți seta prin scriptul PowerShell înainte de pornire:
   ```powershell
   . .\scripts\set-local-secrets.ps1
   ```
4. Pornește stiva completă în fundal (detached mode):
   ```bash
   docker compose up -d
   ```
5. Pentru a urmări log-urile (ex. să vezi când se termină compilarea backend-ului):
   ```bash
   docker compose logs -f
   ```
6. Pentru a opri mediul de dezvoltare:
   ```bash
   docker compose down
   ```

## Comenzi de verificare manuala

Backend tests:

```powershell
cd .\akadion-backend-modificat\akadion-backend-modificat\proiect
.\mvnw.cmd test
.\mvnw.cmd package -DskipTests
```

Frontend checks:

```powershell
cd .\frontend
npm run build
npm run lint
```

## Keycloak manual

`backend-login`:

- Client authentication ON
- Standard flow ON
- Direct access grants OFF
- PKCE S256
- redirect login: `http://localhost:8081/login/oauth2/code/keycloak`
- redirect register: `http://localhost:8081/login/oauth2/code/keycloak-register`
- Valid Redirect URIs: `http://localhost:8081/login/oauth2/code/keycloak`, `http://localhost:8081/login/oauth2/code/keycloak-register`
- Web Origins: `http://localhost:5173`, `http://localhost:8081`
- Post logout redirect URI: `http://localhost:5173`

`backend-admin-api`:

- Client authentication ON
- Standard flow OFF
- Direct access grants OFF
- Service account roles ON
- `realm-management/manage-users`
- `realm-management/view-users`

## URL-uri utile

- Keycloak account: `http://localhost:8080/realms/Akadion/account`
- OpenID configuration: `http://localhost:8080/realms/Akadion/.well-known/openid-configuration`
- Login: `http://localhost:5173/oauth2/authorization/keycloak`
- Register: `http://localhost:5173/oauth2/authorization/keycloak-register`
- Complete profile: `http://localhost:5173/complete-profile`
- Admin: `http://localhost:5173/admin/users`
- Backend health: `http://localhost:8081/actuator/health`

Pagina `Keycloak account` nu este echivalenta cu loginul aplicatiei. Pentru autentificare in fluxul aplicatiei foloseste URL-urile de `Login` si `Register` de mai sus.
