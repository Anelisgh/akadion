# Plan pentru echipa RAG/FastAPI: Autentificare Basic Auth

## Context (scurt)

Backend-ul Spring Boot apelează serviciul vostru FastAPI pe 3 rute: `POST /ingest`, `DELETE /ingest/{id}`, `POST /chat`. **Acum, backend-ul Java a fost deja configurat să trimită un header de Basic Auth la fiecare cerere.** Pentru a închide circuitul de securitate, FastAPI trebuie să confirme că acele credențiale sunt corecte înainte să proceseze cererea.

**Ce NU e asta:** nu e autentificare de utilizator individual (student/profesor). Cine are voie să pună întrebări pe ce curs e deja verificat complet de Spring Boot, înainte ca request-ul să ajungă la voi. Voi nu trebuie să știți nimic despre roluri, studenți sau cursuri — doar să confirmați "acest request vine chiar de la backend-ul nostru Java", nu altceva.

## Ce trebuie să faceți

### 1. Adăugați o dependency de verificare, aplicată pe toate cele 3 rute existente

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

Aplicați-o pe toate 3 rutele:
```python
@app.post("/ingest", dependencies=[Depends(verify_credentials)])
@app.delete("/ingest/{document_id}", dependencies=[Depends(verify_credentials)])
@app.post("/chat", dependencies=[Depends(verify_credentials)])
```

**De ce `secrets.compare_digest` și nu `==`:** o comparație obișnuită de string-uri (`==`) se oprește la primul caracter diferit, ceea ce face teoretic posibil un timing attack (cineva poate ghici parola caracter cu caracter măsurând cât durează răspunsul). `compare_digest` compară în timp constant. E un singur cuvânt în plus de scris, nu costă nimic să-l folosiți corect.

### 2. Configurați mediul local (și producția)

Pentru dezvoltarea locală, backend-ul a fost configurat să trimită automat următoarele date (fallback implicit):
- `RAG_SERVICE_USERNAME=<setat în mediul local sau de deploy>`
- `RAG_SERVICE_PASSWORD=<setat în mediul local sau de deploy>`

Vă puteți configura mediul local să folosească direct aceste credențiale în `.env`. Pentru producție, Anelis vă va furniza un secret real pe care îl veți pune în variabilele de mediu, care va suprascrie aceste valori locale.

### 3. Testați manual cu `curl` înainte să confirmați că e gata

```bash
# Fără header de autentificare -> trebuie sa primiti 401
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{}'

# Cu credentiale gresite -> trebuie sa primiti tot 401
curl -X POST http://localhost:8000/chat -u utilizator_gresit:parola_gresita -H "Content-Type: application/json" -d '{}'

# Cu credentiale corecte -> trebuie sa treaca de autentificare (poate da alta eroare, de validare payload, dar NU 401)
curl -X POST http://localhost:8000/chat -u USERNAME_REAL:PAROLA_REALA -H "Content-Type: application/json" -d '{}'
```

## Ce NU trebuie să faceți

- Nu integrați nimic cu Keycloak — Basic Auth-ul ăsta e complet independent de sistemul de autentificare al utilizatorilor.
- Nu validați roluri (student/profesor/admin) — asta rămâne exclusiv responsabilitatea backend-ului Spring.
- Nu stocați parole de utilizatori sau vreun alt secret — doar acest username+parolă unic, de serviciu, partajat cu backend-ul.
- Nu schimbați nimic din logica de ingestie, embeddings, sau formatul răspunsurilor pe care le trimiteți acum — se adaugă strict un pas de verificare la intrarea în fiecare rută, nimic altceva.

## O notă despre securitate în rețea (informativ, nu neapărat de acționat acum)

Basic Auth trimite credențialele codate base64 (nu criptate) — e sigur doar dacă traficul dintre Spring Boot și FastAPI rămâne intern (aceeași rețea Docker, nu expus public). Dacă la un moment dat serviciul vostru devine accesibil direct din exterior, va trebui pus în spatele unui proxy HTTPS — dar asta nu e o grijă a voastră acum, cât timp comunicați doar intern cu backend-ul.

## Checklist rapid

- [ ] Implementat `verify_credentials` (cu `secrets.compare_digest`, nu `==`)
- [ ] Aplicat pe toate 3 rutele: `/ingest` (POST), `/ingest/{id}` (DELETE), `/chat` (POST)
- [ ] Setați variabilele de mediu pentru testare locală fără a le păstra în fișiere urmărite de Git
- [ ] Testat cu `curl`: fără auth → 401, auth greșit → 401, auth corect → trece
- [ ] Confirmat către Anelis că e gata (Notă: Partea de Spring Boot a fost deja implementată și trimite header-ul)
