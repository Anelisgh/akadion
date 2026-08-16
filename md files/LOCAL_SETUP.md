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

## Pornire si oprire one-click

Intreaga stiva (PostgreSQL, MinIO, Keycloak, Backend, Frontend) este containerizata si orchestrata cu Docker Compose.

1. Asigura-te ca **Docker Desktop** este pornit.
2. Verifica fisierul `.env.local` din radacina proiectului. Acesta contine credentialele locale si este ignorat de Git.
3. Porneste aplicatia cu dublu-click pe `Start Akadion.cmd`.
4. Opreste aplicatia cu dublu-click pe `Stop Akadion.cmd`.

Launcherul de pornire:

- incarca automat variabilele din `.env.local` daca exista, altfel din `.env`
- creeaza reteaua Docker externa `akadion_shared` daca lipseste
- ruleaza `docker compose up -d --build`
- verifica serviciile principale
- deschide `http://localhost:5173`

Launcherul de oprire ruleaza `docker compose down` si pastreaza volumele Docker locale.

## Comenzi manuale fallback

Pornire:

```powershell
.\scripts\start-akadion.ps1
```

Oprire:

```powershell
.\scripts\stop-akadion.ps1
```

Loguri:

```bash
docker compose logs -f
```

Oprire cu stergerea volumelor locale:

```powershell
.\scripts\stop-akadion.ps1 -RemoveVolumes
```

## Comenzi de verificare manuala

Backend tests:

```powershell
cd .\backend\akadion
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
