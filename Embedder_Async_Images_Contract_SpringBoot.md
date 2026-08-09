# Procesare Asincronă a Imaginilor din PDF — Ce Trebuie să Știe Echipa Spring Boot

> De la: Embedder Service (Teo)
> Pentru: Echipa Spring Boot
> Scop: Adăugăm procesare de imagini din PDF-uri (captioning cu Gemini Vision). Partea de text rămâne sincronă, dar imaginile se procesează async, în fundal. Asta introduce **o stare nouă** și **un endpoint nou** de care aveți nevoie voi.

---

## 1. Ce se schimbă, pe scurt

Până acum, când indexați un document, Embedder-ul procesa totul (text) sincron și vă întorcea direct `INDEXED` sau `FAILED`.

De acum înainte, Embedder-ul va procesa **și imaginile** din PDF (diagrame, poze, capturi de ecran) — le trimite la Gemini Vision, primește o descriere text, o transformă în vector și o stochează în Qdrant, la fel ca textul obișnuit.

**Problema:** procesarea imaginilor poate dura mult (mai multe apeluri către Gemini, unul per imagine). Dacă am aștepta să se termine și asta înainte să vă răspundem, riscăm să depășim timeout-ul actual de 60s pe care voi îl acordați apelului de ingest.

**Soluția:** despărțim procesarea în două faze:
1. **Sincron** (ca acum) — textul e procesat, documentul devine căutabil, vă răspundem imediat.
2. **Asincron** (nou) — imaginile se procesează în fundal, după ce v-am răspuns deja. Când se termină, vă anunțăm noi printr-un apel separat.

---

## 2. Starea nouă: `INDEXED_TEXT_ONLY`

Trebuie acceptată ca valoare validă pentru `documente.status_index`, pe lângă cele existente.

| Valoare | Înseamnă | Documentul e căutabil de studenți? |
|---|---|---|
| `NULL` | Neindexat încă | ❌ Nu |
| **`INDEXED_TEXT_ONLY`** ⭐ NOU | Textul e procesat și indexat; imaginile sunt încă în curs de procesare | ✅ **Da** — dar doar pe baza textului, imaginile nu sunt încă incluse |
| `INDEXED` | Text **și** imagini complet procesate | ✅ Da, complet |
| `FAILED` | A eșuat procesarea textului (eroare blocantă) | ❌ Nu |

### Ce înseamnă practic pentru voi:

- **`INDEXED_TEXT_ONLY` este o stare "bună", nu o eroare.** Documentul e deja util și căutabil, doar că nu e 100% complet. Nu tratați această stare ca pe un eșec.
- Răspunsul nostru sincron la `POST /api/documents/ingest` va avea acum `status: "INDEXED_TEXT_ONLY"` în loc de `"INDEXED"`, imediat ce textul e gata. Statusul `"INDEXED"` complet vine **mai târziu**, printr-un apel separat (vezi Secțiunea 3).
- Pe termen mediu, un document ajunge întotdeauna în `INDEXED_TEXT_ONLY` întâi, apoi (după ce se termină procesarea imaginilor) trece automat în `INDEXED`. Dacă nu are imagini deloc în PDF, tranziția se întâmplă practic instant.

### Ce trebuie să faceți voi:

1. **Backend:** acceptați `INDEXED_TEXT_ONLY` ca valoare validă în coloana `status_index` (e deja `VARCHAR(20)`, deci nu e nevoie de migrare de schemă, doar de logică nouă acolo unde verificați valoarea asta).
2. **Frontend (React):** decideți cum afișați starea asta profesorului — de exemplu un badge intermediar ("Indexat parțial — se procesează imaginile") diferit de badge-ul verde complet ("Indexat") și de cel roșu ("Eșuat"). Butonul "Reindexează" trebuie să rămână disponibil și în starea asta.
3. **Studenți:** nu trebuie să faceți nimic special — dacă `status_index` e `INDEXED_TEXT_ONLY` sau `INDEXED`, documentul e oricum căutabil în chat (diferența e doar cât de complet e conținutul indexat).

---

## 3. Endpoint nou pe care trebuie să-l construiți voi

Când procesarea imaginilor se termină în fundal la noi, avem nevoie să vă anunțăm rezultatul — pentru că **noi nu avem acces la PostgreSQL**, doar voi puteți face UPDATE pe `documente.status_index`.

Propunere de contract (deschisă la discuție/ajustări din partea voastră):

```
PATCH /api/internal/documents/{document_id}/image-status
```

### Request body (trimis de noi către voi):

```json
{
  "status": "INDEXED",
  "images_processed": 5,
  "images_failed": 0
}
```

sau, dacă procesarea imaginilor a eșuat complet:

```json
{
  "status": "FAILED_IMAGES",
  "images_processed": 0,
  "images_failed": 3,
  "error": "Gemini Vision unavailable"
}
```

### Ce trebuie să facă acest endpoint la voi:

- `status: "INDEXED"` → `UPDATE documente SET status_index = 'INDEXED' WHERE id = {document_id}`
- `status: "FAILED_IMAGES"` → decideți voi: fie rămâne `INDEXED_TEXT_ONLY` (recomandarea noastră — documentul tot funcționează, doar fără imagini), fie introduceți o stare separată `FAILED_IMAGES` dacă vreți să afișați asta explicit profesorului.

### Autentificare

Acest apel pleacă de la noi către voi — e sensul opus față de toate apelurile de până acum (până acum voi ne apelați pe noi, cu Basic Auth pe care ni l-ați dat). Propunem simetric: **voi ne dați nouă un username/parolă** (sau alt mecanism, de discutat) pentru acest endpoint, ca să nu fie deschis public. Spuneți-ne ce preferați și-l configurăm la noi.

### Timeout / retry

Vă recomandăm un timeout generos (10-15s) pe acest apel din partea noastră, și eventual un retry simplu (2-3 încercări) dacă primul eșuează — dar asta e detaliu de implementare la noi, nu vă afectează pe voi.

### De ce apare acest endpoint abia acum, și nu a existat un echivalent pentru text

Poate părea ciudat că apare un apel nou "invers" (de la noi către voi) — până acum voi ne apelați mereu pe noi, niciodată reversul. Explicația e simplă:

- **La procesarea de text (sincronă):** voi apelați `POST /api/documents/ingest` și **așteptați pe aceeași conexiune HTTP** până terminăm. Când răspundem, voi citiți `status` direct din body și faceți voi `UPDATE status_index`. Nu e nevoie de niciun apel suplimentar — informația "vine gratis" ca parte din răspunsul la apelul vostru.
- **La procesarea de imagini (asincronă):** vă răspundem rapid cu `INDEXED_TEXT_ONLY`, iar **conexiunea HTTP se închide** imediat după. Când imaginile se termină de procesat, minute mai târziu, acea conexiune nu mai există — nu există nicio cale prin care să "adăugăm" ceva la un răspuns deja trimis. Singura opțiune e să inițiem noi un apel nou, separat, către voi.

**Regula generală:** orice bucată de procesare care devine asincronă are nevoie de propriul ei canal de notificare înapoi (webhook/callback, ca aici, sau polling, sau coadă de mesaje) — pentru că nu mai poate "agăța" rezultatul de apelul HTTP original. Dacă în viitor ar deveni necesar ca și partea de text să fie procesată asincron (documente foarte mari, care depășesc 60s), ar avea nevoie de exact același tip de mecanism.

---

## 4. Ce NU se schimbă

Ca să fie clar ce rămâne exact la fel:

- **Contractul `POST /api/documents/ingest`** — request-ul rămâne identic (`document_id`, `course_id`, `week_id`, `path_minio`, `document_title`, `professor_id`). Se schimbă doar valoarea posibilă a `status` din răspuns.
- **Timeout-ul vostru de 60s pe ingest** — rămâne suficient, pentru că acum apelul sincron nu mai așteaptă și imaginile.
- **`DELETE /api/documents/{document_id}`** — funcționează neschimbat, șterge tot (text + imagini) indiferent de stare.
- **Flow-ul de chat / `/api/chat`** — complet neschimbat. Studenții pot găsi acum și rezultate provenite din imagini, dar voi nu vedeți nicio diferență în cum apelați `llm-response-service`.
- **`/api/query/embed`** — neschimbat.

---

## 5. Diagrama fluxului complet (pentru context)

```
Profesor apasă "Indexează document"
        ↓
Spring Boot → POST /api/documents/ingest (Embedder)
        ↓
[Embedder procesează SINCRON: text → chunking → embedding → Qdrant]
        ↓
Embedder răspunde: { status: "INDEXED_TEXT_ONLY", chunks_count: N }
        ↓
Spring Boot: UPDATE status_index = 'INDEXED_TEXT_ONLY'
        ↓
React: profesorul vede badge-ul intermediar, poate naviga în altă parte
        │
        │   [Embedder continuă ASINCRON, în fundal, fără ca voi să așteptați]
        │   extrage imagini → Gemini Vision → caption → embedding → Qdrant
        │
        ↓ (când se termină, posibil câteva minute mai târziu)
Embedder → PATCH /api/internal/documents/{document_id}/image-status (Spring Boot) ⭐ NOU
        ↓
Spring Boot: UPDATE status_index = 'INDEXED'
        ↓
React: la următorul refresh/poll, profesorul vede badge-ul final "Indexat complet"
```

---

## 6. Puncte de decis împreună, înainte să finalizăm

1. **Numele și forma exactă** a endpoint-ului `PATCH .../image-status` — sunteți de acord cu propunerea de mai sus, sau preferați altă rută/structură?
2. **Autentificarea** pentru acest apel invers (noi → voi) — ce mecanism preferați?
3. **Ce faceți dacă imaginile eșuează** — rămâne `INDEXED_TEXT_ONLY` sau introduceți `FAILED_IMAGES` separat?
4. **Cum arată în UI** starea intermediară — aveți nevoie de mockup/wireframe de la noi, sau vă ocupați voi de partea de React?

---

**Contact pentru întrebări:** Teo (Embedder Service)
