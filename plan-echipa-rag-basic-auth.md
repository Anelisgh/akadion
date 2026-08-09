# Plan pentru echipa RAG/FastAPI: Autentificare Basic Auth

## Context (scurt)

Backend-ul Spring Boot apeleaz─â serviciul vostru FastAPI pe 3 rute: `POST /ingest`, `DELETE /ingest/{id}`, `POST /chat`. **Acum, backend-ul Java a fost deja configurat s─â trimit─â un header de Basic Auth la fiecare cerere.** Pentru a ├«nchide circuitul de securitate, FastAPI trebuie s─â confirme c─â acele creden╚¢iale sunt corecte ├«nainte s─â proceseze cererea.

**Ce NU e asta:** nu e autentificare de utilizator individual (student/profesor). Cine are voie s─â pun─â ├«ntreb─âri pe ce curs e deja verificat complet de Spring Boot, ├«nainte ca request-ul s─â ajung─â la voi. Voi nu trebuie s─â ╚Öti╚¢i nimic despre roluri, studen╚¢i sau cursuri ΓÇö doar s─â confirma╚¢i "acest request vine chiar de la backend-ul nostru Java", nu altceva.

## Ce trebuie s─â face╚¢i

### 1. Ad─âuga╚¢i o dependency de verificare, aplicat─â pe toate cele 3 rute existente

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets
import os

security = HTTPBasic()

RAG_SERVICE_USERNAME = os.environ["RAG_SERVICE_USERNAME"]
RAG_SERVICE_PASSWORD = os.environ["RAG_SERVICE_PASSWORD"]

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, RAG_SERVICE_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, RAG_SERVICE_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
```

Aplica╚¢i-o pe toate 3 rutele:
```python
@app.post("/ingest", dependencies=[Depends(verify_credentials)])
@app.delete("/ingest/{document_id}", dependencies=[Depends(verify_credentials)])
@app.post("/chat", dependencies=[Depends(verify_credentials)])
```

**De ce `secrets.compare_digest` ╚Öi nu `==`:** o compara╚¢ie obi╚Önuit─â de string-uri (`==`) se opre╚Öte la primul caracter diferit, ceea ce face teoretic posibil un timing attack (cineva poate ghici parola caracter cu caracter m─âsur├ónd c├ót dureaz─â r─âspunsul). `compare_digest` compar─â ├«n timp constant. E un singur cuv├ónt ├«n plus de scris, nu cost─â nimic s─â-l folosi╚¢i corect.

### 2. Configura╚¢i mediul local (╚Öi produc╚¢ia)

Pentru dezvoltarea local─â, backend-ul a fost configurat s─â trimit─â automat urm─âtoarele date (fallback implicit):
- `RAG_SERVICE_USERNAME=<setat ├«n mediul local sau de deploy>`
- `RAG_SERVICE_PASSWORD=<setat ├«n mediul local sau de deploy>`

V─â pute╚¢i configura mediul local s─â foloseasc─â direct aceste creden╚¢iale ├«n `.env`. Pentru produc╚¢ie, Anelis v─â va furniza un secret real pe care ├«l ve╚¢i pune ├«n variabilele de mediu, care va suprascrie aceste valori locale.

### 3. Testa╚¢i manual cu `curl` ├«nainte s─â confirma╚¢i c─â e gata

```bash
# F─âr─â header de autentificare -> trebuie sa primiti 401
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{}'

# Cu credentiale gresite -> trebuie sa primiti tot 401
curl -X POST http://localhost:8000/chat -u utilizator_gresit:parola_gresita -H "Content-Type: application/json" -d '{}'

# Cu credentiale corecte -> trebuie sa treaca de autentificare (poate da alta eroare, de validare payload, dar NU 401)
curl -X POST http://localhost:8000/chat -u USERNAME_REAL:PAROLA_REALA -H "Content-Type: application/json" -d '{}'
```

## Ce NU trebuie s─â face╚¢i

- Nu integra╚¢i nimic cu Keycloak ΓÇö Basic Auth-ul ─âsta e complet independent de sistemul de autentificare al utilizatorilor.
- Nu valida╚¢i roluri (student/profesor/admin) ΓÇö asta r─âm├óne exclusiv responsabilitatea backend-ului Spring.
- Nu stoca╚¢i parole de utilizatori sau vreun alt secret ΓÇö doar acest username+parol─â unic, de serviciu, partajat cu backend-ul.
- Nu schimba╚¢i nimic din logica de ingestie, embeddings, sau formatul r─âspunsurilor pe care le trimite╚¢i acum ΓÇö se adaug─â strict un pas de verificare la intrarea ├«n fiecare rut─â, nimic altceva.

## O not─â despre securitate ├«n re╚¢ea (informativ, nu neap─ârat de ac╚¢ionat acum)

Basic Auth trimite creden╚¢ialele codate base64 (nu criptate) ΓÇö e sigur doar dac─â traficul dintre Spring Boot ╚Öi FastAPI r─âm├óne intern (aceea╚Öi re╚¢ea Docker, nu expus public). Dac─â la un moment dat serviciul vostru devine accesibil direct din exterior, va trebui pus ├«n spatele unui proxy HTTPS ΓÇö dar asta nu e o grij─â a voastr─â acum, c├ót timp comunica╚¢i doar intern cu backend-ul.

## Checklist rapid

- [ ] Implementat `verify_credentials` (cu `secrets.compare_digest`, nu `==`)
- [ ] Aplicat pe toate 3 rutele: `/ingest` (POST), `/ingest/{id}` (DELETE), `/chat` (POST)
- [ ] Seta╚¢i variabilele de mediu pentru testare local─â f─âr─â a le p─âstra ├«n fi╚Öiere urm─ârite de Git
- [ ] Testat cu `curl`: f─âr─â auth ΓåÆ 401, auth gre╚Öit ΓåÆ 401, auth corect ΓåÆ trece
- [ ] Confirmat c─âtre Anelis c─â e gata (Not─â: Partea de Spring Boot a fost deja implementat─â ╚Öi trimite header-ul)