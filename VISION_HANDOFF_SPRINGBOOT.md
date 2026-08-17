# Predarea pipeline-ului de imagini (Gemini Vision) — embedder → Spring Boot

> Document de handoff: ce am construit deja pe partea de `embedder_service` (Python/FastAPI) pentru captioning-ul imaginilor cu Gemini Vision, și ce lipsește pe partea de Spring Boot ca bucla să se închidă efectiv.
>
> Stare la 17 august 2026, commit-uri `ce0803a` → `efcfb6a`. Text-ul (ingest, delete, query embed) e integrat și funcțional; **imaginile sunt implementate și testate pe embedder, dar callback-ul de status n-are încă unde să ajungă pe Spring Boot.**

---

## TL;DR

- **Ce e gata:** extragere + captioning + indexare imagini, complet funcțional și testat, rulează async după ingest-ul de text. Callback-ul de status e implementat și trimite, dar n-are unde să ajungă încă.
- **Ce blochează:** nu există, pe Spring Boot, un endpoint care să primească `PATCH .../image-status`. Până apare, documentele rămân la `INDEXED_TEXT_ONLY` chiar dacă imaginile s-au indexat cu succes în Qdrant.

---

## Cum arată fluxul (implementat)

Ingest-ul de text rămâne sincron ca înainte. Imaginile sunt procesate separat, după ce răspunsul de text a plecat deja spre Spring Boot.

```
[sincron]                [răspuns imediat]              [fundal · async, în ordine]
POST /ingest        →    HTTP 200                  ⇢    extrage imagini (PyMuPDF)
text extras,              INDEXED_TEXT_ONLY              → caption per imagine (Gemini Vision)
chunked, embedat,         către Spring Boot               → embed caption-uri + upsert Qdrant
salvat în Qdrant                                          → PATCH image-status → Spring Boot
```

Ultima cutie e cea care nu are, deocamdată, unde să ajungă — vezi secțiunea **„Ce trebuie făcut de voi"** mai jos.

---

## Ce am făcut eu (gata, testat)

Tot ce urmează există în `embedder_service`, e testat (`test_image_extractor.py`, `test_image_pipeline.py`, `test_vision_captioner.py`, `test_springboot_callback.py`) și rulează în docker-compose local.

### 1. Extragere imagini din PDF
`image_extractor.py` — cu PyMuPDF, imagine cu imagine, pe fiecare pagină. Filtrate după dimensiune minimă (`MIN_IMAGE_WIDTH`/`MIN_IMAGE_HEIGHT`, implicit 100×100px, ca să scape iconițe/linii decorative) și plafonate la `MAX_IMAGES_PER_DOCUMENT` (implicit 20), ca un PDF cu sute de imagini să nu blocheze job-ul.

### 2. Captioning cu Gemini Vision
`vision_captioner.py` — un caption per imagine, în engleză (promptul a fost tradus recent din română, commit `efcfb6a`), gândit pentru căutare semantică ("ce ar întreba un student"), nu descriere generică. Model configurabil prin `GEMINI_VISION_MODEL` (implicit `gemini-3.1-flash-lite`).

Eșecul pe o singură imagine (Gemini indisponibil, imagine coruptă, caption gol) nu oprește bucla — se sare peste ea și se continuă cu următoarea.

### 3. Rate limiting către Gemini
`GEMINI_REQUEST_DELAY_SECONDS` — pauză configurabilă (implicit 13s) între cereri, ca să nu lovim limita de rate a API-ului Gemini. Practic: un document cu 20 de imagini poate dura ~4 minute până la callback-ul final.

### 4. Embedding + indexare în Qdrant
`image_pipeline.py` — fiecare caption e embedat cu același model BGE-M3 folosit pentru text și salvat în colecția `course_chunks`, cu `source_type="image"` și `page_number` în payload — ca să poată fi distinse ulterior de chunk-urile de text la căutare.

### 5. Protecție la re-indexare concurentă
`ingest_version` — dacă profesorul apasă "reindexează" înainte ca job-ul vechi de imagini să termine, job-ul vechi detectează (printr-un UUID generat la fiecare ingest) că nu mai e cel curent și renunță liniștit — nu suprascrie Qdrant cu rezultate vechi, nu trimite callback.

### 6. Client de callback către Spring Boot
`springboot_callback.py` — la final (succes sau eșec), trimite `PATCH {SPRING_BOOT_CALLBACK_URL}` cu Basic Auth, 3 încercări cu pauză 2s între ele. Dacă eșuează definitiv, loghează eroarea și nu blochează nimic altceva — documentul rămâne pur și simplu la `INDEXED_TEXT_ONLY`.

### 7. Server mock pentru testare locală
`mock_springboot.py` — un mic FastAPI care ascultă pe `:9090/image-status` și doar printează ce primește — l-am folosit ca să validez callback-ul înainte să existe implementarea reală pe Spring Boot.

### 8. Config + docker-compose
Toate variabilele de mai jos sunt deja cablate în `docker-compose.yml` și documentate în `README.md`. Plus, fix recent la path-ul de `DELETE /api/documents/ingest/{id}` ca să corespundă exact cu ce apelează `RagIngestService.java` (commit `7f98861`).

---

## Contractul de callback (de implementat pe Spring Boot)

Ăsta e mesajul exact pe care embedder-ul îl trimite deja. Momentan e o **presupunere de payload** (comentată așa direct în cod) — nu a fost confirmat printr-un contract oficial semnat de ambele părți, deci e negociabil dacă vreo formă nu se potrivește cu ce aveți deja pe entitatea de document.

```
PATCH {SPRING_BOOT_CALLBACK_URL}
Authorization: Basic <SPRING_BOOT_CALLBACK_USERNAME:PASSWORD>
Content-Type: application/json

{
  "document_id": 123,
  "status": "INDEXED",        // sau "FAILED_IMAGES"
  "images_indexed": 5,
  "images_failed": 1
}
```

`status: "INDEXED"` apare și când documentul pur și simplu nu are imagini (nu e o eroare). `"FAILED_IMAGES"` apare doar dacă Gemini a fost complet indisponibil sau toate imaginile au eșuat captioning-ul.

---

## Ce trebuie făcut de voi (Spring Boot)

### 1. Endpoint care primește callback-ul
O rută `PATCH` (pe orice path decideți — embedder-ul o apelează la orice adresă puneți în `SPRING_BOOT_CALLBACK_URL`) care acceptă payload-ul de mai sus cu Basic Auth.

Trebuie să actualizeze statusul documentului din `INDEXED_TEXT_ONLY` spre `INDEXED` sau `FAILED_IMAGES`, și să fie **idempotentă** — embedder-ul poate trimite același payload de până la 3 ori dacă prima încercare pică la nivel de rețea, nu de procesare.

### 2. Credențiale + URL pentru callback
Trei valori de stabilit împreună: `SPRING_BOOT_CALLBACK_URL`, `SPRING_BOOT_CALLBACK_USERNAME`, `SPRING_BOOT_CALLBACK_PASSWORD`. În `.env`-ul local sunt setate momentan spre `mock_springboot.py` (`http://localhost:9090/image-status`), nu spre un endpoint Spring Boot real — folosite doar cât timp am validat local clientul de callback. Trebuie înlocuite cu URL-ul și credențialele reale odată ce endpoint-ul de la punctul 1 există. (Dacă aceste variabile lipsesc complet din `.env`, valoarea implicită e `""` și callback-ul e dezactivat silențios — nu crapă nimic, doar nu se trimite.)

### 3. Tratarea stării intermediare `INDEXED_TEXT_ONLY`
Momentan Spring Boot primește `INDEXED_TEXT_ONLY` ca răspuns sincron la ingest, nu `INDEXED`. Trebuie decis ce vede profesorul cât timp documentul e doar text-indexat (căutabil, dar fără imagini încă) — un status separat în UI, sau tratat identic cu "indexat" până vine al doilea callback?

### 4. Plan pentru eșec definitiv al callback-ului
Dacă toate cele 3 încercări eșuează (Spring Boot jos, rețea etc.), documentul rămâne `INDEXED_TEXT_ONLY` la nesfârșit din punctul de vedere al Spring Boot, deși imaginile s-ar putea să fie deja indexate corect în Qdrant. Merită un job de reconciliere periodic, sau minimum, un buton vizibil de "reindexează" pentru acest caz.

### 5. Deschis — afișarea imaginii propriu-zise
Important de discutat: chunk-urile `source_type="image"` din Qdrant conțin **doar caption-ul text + `page_number` + `document_id`**, nu un URL sau un ID către imaginea binară. Dacă LLM Response Service sau UI-ul vor să afișeze imaginea (nu doar caption-ul ei) într-un răspuns de chat, e nevoie de un mecanism suplimentar care momentan nu există — de exemplu, embedder-ul ar trebui extins să salveze imaginile extrase undeva accesibil (MinIO?) și să pună un URL în payload.

---

## Referință rapidă — variabile de mediu

| Variabilă | Implicit | Cine o setează |
|---|---|---|
| `GEMINI_API_KEY` | — (obligatoriu) | embedder — deja setat |
| `GEMINI_VISION_MODEL` | `gemini-3.1-flash-lite` | embedder — deja setat |
| `GEMINI_REQUEST_DELAY_SECONDS` | `13.0` | embedder — deja setat |
| `MIN_IMAGE_WIDTH` / `MIN_IMAGE_HEIGHT` | `100` / `100` | embedder — deja setat |
| `MAX_IMAGES_PER_DOCUMENT` | `20` | embedder — deja setat |
| `SPRING_BOOT_CALLBACK_URL` | `""` | de completat împreună |
| `SPRING_BOOT_CALLBACK_USERNAME` | `""` | de completat împreună |
| `SPRING_BOOT_CALLBACK_PASSWORD` | `""` | de completat împreună |

---

## Întrebări deschise

- **Path-ul exact al endpoint-ului de callback?** Embedder-ul nu presupune nimic — apelează orice URL e în `SPRING_BOOT_CALLBACK_URL`. Convenția din README/plan e ceva de forma `.../image-status`, dar rămâne de confirmat.
- **Merită un status vizibil separat pentru "text indexat, imagini în lucru"**, sau e suficient să apară "indexat" abia după al doilea callback?
- **Se vor afișa vreodată imaginile propriu-zise** (nu doar caption-ul lor) în răspunsurile de chat? Dacă da, de discutat unde se stochează și cum se leagă de rezultatul de căutare.
