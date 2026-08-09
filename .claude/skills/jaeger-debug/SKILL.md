---
name: jaeger-debug
description: Use when investigating an error, a failed request, a timeout, a 502/500, or something slow in the akadion stack - chat/RAG requests that fail or hang, ingest marked ERONAT, latency spikes, "nu merge chat-ul", "e lent", "a picat", or any question about which service in the chain broke or where the time went. Also for tracing a request end-to-end across backend, llm-response, embedder, reranker, Qdrant.
---

# Investigare erori și latențe prin Jaeger

Stiva emite **doar trace-uri** OTLP (metrici și loguri sunt `none`). Jaeger îți spune *unde* s-a rupt
lanțul și *unde s-a dus timpul*; **de ce** s-a rupt află doar din logurile JSON ale serviciului.

## Adrese (verificate)

| Serviciu | Adresă | Health |
|---|---|---|
| Jaeger UI / API | `http://akadion-rag-jaeger-1:16686` | `/api/services` |
| backend Spring | `http://akadion-backend:8081` | `/actuator/health` |
| llm-response | `http://akadion-rag-llm-response-1:8000` | `/health` |
| embedder | `http://akadion-rag-embedder-1:8001` | **`/api/health`** |
| reranker | `http://akadion-rag-reranker-1:8002` | **`/api/health`** |
| Qdrant | `http://akadion-rag-qdrant-1:6333` | `/healthz`, `/collections` |

Nume de serviciu în Jaeger: `akadion-backend`, `llm-response`, `embedder`, `reranker`
(≠ numele din câmpul `service` al logurilor, unde backendul apare ca `backend`).

## Ce dă Jaeger și ce nu

Instrumentarea e **exclusiv automată** (`-javaagent:/otel.jar`, `opentelemetry-instrument`), deci
span-urile poartă doar atribute standard: `http.method`, `http.url`, `http.status_code`,
`otel.status_code`, `error`, `db.statement`. **`request_id` și `X-User` NU apar în span-uri.**

Legătura dintre cele două lumi:

- `trace_id` / `span_id` → injectate în logurile JSON (`OTEL_INSTRUMENTATION_LOGBACK_MDC_ENABLED`
  pe backend, `JsonFormatter` pe cele trei servicii Python). **Acesta e join-ul Jaeger ↔ log.**
- `request_id` (`X-Request-ID`, 16 hex) → propagat de `RequestIdFilter` → interceptorul din
  `RagClientConfig` → middleware-ul FastAPI. **Acesta e join-ul log ↔ log**, între servicii.

## Flux de lucru

1. **Găsește trace-ul** (după eroare, după durată, sau după `traceID` dacă îl ai deja).
2. **Citește span-urile** — primul span cu `error=true` sau cu durata dominantă e vinovatul.
3. **Ia `trace_id` și caută-l în logurile serviciului** pentru mesajul real de eroare.

```bash
J=http://akadion-rag-jaeger-1:16686

# ce servicii raportează
curl -s "$J/api/services" | jq -r '.data[]'

# trace-uri cu eroare, ultima oră
curl -s -G "$J/api/traces" \
  --data-urlencode 'service=llm-response' \
  --data-urlencode 'tags={"error":"true"}' \
  --data-urlencode 'lookback=1h' --data-urlencode 'limit=20' \
  | jq -r '.data[] | "\(.traceID) \(([.spans[].duration]|max)/1000)ms [\([.processes[].serviceName]|unique|join(","))]"'

# trace-uri lente (minDuration acceptă 500ms / 2s / 1m)
curl -s -G "$J/api/traces" \
  --data-urlencode 'service=akadion-backend' \
  --data-urlencode 'minDuration=2s' \
  --data-urlencode 'lookback=1h' --data-urlencode 'limit=20' \
  | jq -r '.data[] | "\(.traceID) \(([.spans[].duration]|max)/1000)ms"'

# waterfall-ul unui trace: cine, cât, cu ce status
curl -s "$J/api/traces/<traceID>" | jq -r '
  .data[0] as $t | $t.spans | sort_by(.startTime)[] |
  "\($t.processes[.processID].serviceName)\t\(.operationName)\t\(.duration/1000)ms\t\(
    [.tags[]|select(.key|test("http.status_code|http.url|otel.status_code|error|db.statement"))
     |"\(.key)=\(.value)"]|join(" "))"' | column -ts$'\t'
```

Filtrare pe operație: `--data-urlencode 'operation=POST /chat'`
(listează operațiile cu `curl -s "$J/api/services/llm-response/operations"`).

## Maparea trace → lanțul real

Un `POST /api/conversatii/{id}/mesaje` sănătos produce **un singur trace**, cu span-uri în ordinea:

```
akadion-backend  POST /api/conversatii/…      ← RequestIdFilter mintește request_id aici
  ├─ akadion       (JDBC, salveazaIntrebare)
  └─ llm-response  POST /chat                  basic auth · 5s connect / 30s read
       ├─ embedder  POST /api/query/embed      basic auth · 30s
       ├─ (Qdrant   search course_chunks)      10s
       ├─ reranker  POST /api/rerank/chunks    FĂRĂ auth · 30s
       └─ (Gemini   generate_content)          FĂRĂ timeout ← suspectul #1 la „atârnă"
```

Ingest: `akadion-backend → embedder POST /api/documents/ingest` (120 s read, best-effort).

**Dacă serviciile apar în trace-uri separate în loc de unul singur, propagarea `traceparent` e ruptă**
— verifică asta înainte de a concluziona că un serviciu „nu a fost apelat".

Praguri utile: `/chat` > 30 s → a expirat timeoutul backendului (frontendul vede 502);
`/chat` blocat fără span de răspuns → cel mai probabil Gemini, singurul apel fără timeout.

## Capcane specifice acestei stive

- **Absența trace-urilor cu eroare NU înseamnă că nu e nimic stricat.** Lanțul RAG are trei
  fallback-uri tăcute care întorc **HTTP 200**: embedder/Qdrant căzut → `MOCK_DOCUMENTS`; reranker
  căzut → primele 5 contexte brute (raportat doar prin `print()`). Un lanț rupt arată în Jaeger
  identic cu unul funcțional. Dacă răspunsul e suspect, verifică `/api/health` la embedder și
  `collections` la Qdrant direct, nu doar trace-urile.
- **Zgomot la pornire:** `embedder` produce span-uri `error=true` pentru `GET huggingface.co/... 404`
  (descărcarea BGE-m3) și backendul loghează `Connection refused` spre Keycloak de 2–3 ori.
  Ignoră-le dacă `http.url` e extern sau sunt din primele secunde de viață ale containerului.
- **`DELETE /api/documents/ingest/{id}` returnează mereu 404** (backendul cheamă un path pe care
  embedderul nu-l expune). E o problemă cunoscută, nu descoperirea ta.
- **reranker nu loghează payload/răspuns pe `/api/rerank/chunks`** (ar inunda logul) — vezi doar
  durata și statusul.
- **Logurile serviciilor RAG se citesc din compose-ul lor**, nu din cel al backendului:
  `docker compose -f akadion-rag/compose.yaml logs --since 15m llm-response | grep <trace_id>`.
  Dacă `docker` nu e disponibil în mediul în care rulezi (unele devcontainere nu îl expun),
  cere-i utilizatorului să ruleze comanda cu prefixul `!`.

## Referință rapidă

| Vrei | Cum |
|---|---|
| lista serviciilor | `GET /api/services` |
| operațiile unui serviciu | `GET /api/services/{service}/operations` |
| trace-uri cu eroare | `GET /api/traces?service=X&tags={"error":"true"}&lookback=1h` |
| trace-uri lente | `…&minDuration=2s` |
| un trace anume | `GET /api/traces/{traceID}` |
| de la Jaeger la log | `trace_id` din span → grep în logul serviciului |
| de la un serviciu la altul, în loguri | `request_id` (`X-Request-ID`) |
| ce e pornit, ce lipsește | `JAEGER-LOGGING.md` din rădăcina acestui repo |
| contractele RAG, auth | `basic-auth-rag.md` din rădăcina acestui repo |

Parametri suportați pe `/api/traces`: `service`, `operation`, `tags` (JSON), `lookback`,
`start`/`end` (microsecunde epoch), `minDuration`, `maxDuration`, `limit`.
