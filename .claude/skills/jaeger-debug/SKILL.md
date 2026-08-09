---
name: jaeger-debug
description: Use when investigating an error, a failed request, a timeout, a 502/500, or something slow in the akadion stack - chat/RAG requests that fail or hang, ingest marked ERONAT, latency spikes, "nu merge chat-ul", "e lent", "a picat", or any question about which service in the chain broke or where the time went. Also for tracing a request end-to-end across backend, llm-response, embedder, reranker, Qdrant.
---

# Investigare erori ╚Öi laten╚¢e prin Jaeger

Stiva emite **doar trace-uri** OTLP (metrici ╚Öi loguri sunt `none`). Jaeger ├«╚¢i spune *unde* s-a rupt
lan╚¢ul ╚Öi *unde s-a dus timpul*; **de ce** s-a rupt afl─â doar din logurile JSON ale serviciului.

## Adrese (verificate)

| Serviciu | Adres─â | Health |
|---|---|---|
| Jaeger UI / API | `http://akadion-rag-jaeger-1:16686` | `/api/services` |
| backend Spring | `http://akadion-backend:8081` | `/actuator/health` |
| llm-response | `http://akadion-rag-llm-response-1:8000` | `/health` |
| embedder | `http://akadion-rag-embedder-1:8001` | **`/api/health`** |
| reranker | `http://akadion-rag-reranker-1:8002` | **`/api/health`** |
| Qdrant | `http://akadion-rag-qdrant-1:6333` | `/healthz`, `/collections` |

Nume de serviciu ├«n Jaeger: `akadion-backend`, `llm-response`, `embedder`, `reranker`
(Γëá numele din c├ómpul `service` al logurilor, unde backendul apare ca `backend`).

## Ce d─â Jaeger ╚Öi ce nu

Instrumentarea e **exclusiv automat─â** (`-javaagent:/otel.jar`, `opentelemetry-instrument`), deci
span-urile poart─â doar atribute standard: `http.method`, `http.url`, `http.status_code`,
`otel.status_code`, `error`, `db.statement`. **`request_id` ╚Öi `X-User` NU apar ├«n span-uri.**

Leg─âtura dintre cele dou─â lumi:

- `trace_id` / `span_id` ΓåÆ injectate ├«n logurile JSON (`OTEL_INSTRUMENTATION_LOGBACK_MDC_ENABLED`
  pe backend, `JsonFormatter` pe cele trei servicii Python). **Acesta e join-ul Jaeger Γåö log.**
- `request_id` (`X-Request-ID`, 16 hex) ΓåÆ propagat de `RequestIdFilter` ΓåÆ interceptorul din
  `RagClientConfig` ΓåÆ middleware-ul FastAPI. **Acesta e join-ul log Γåö log**, ├«ntre servicii.

## Flux de lucru

1. **G─âse╚Öte trace-ul** (dup─â eroare, dup─â durat─â, sau dup─â `traceID` dac─â ├«l ai deja).
2. **Cite╚Öte span-urile** ΓÇö primul span cu `error=true` sau cu durata dominant─â e vinovatul.
3. **Ia `trace_id` ╚Öi caut─â-l ├«n logurile serviciului** pentru mesajul real de eroare.

```bash
J=http://akadion-rag-jaeger-1:16686

# ce servicii raporteaz─â
curl -s "$J/api/services" | jq -r '.data[]'

# trace-uri cu eroare, ultima or─â
curl -s -G "$J/api/traces" \
  --data-urlencode 'service=llm-response' \
  --data-urlencode 'tags={"error":"true"}' \
  --data-urlencode 'lookback=1h' --data-urlencode 'limit=20' \
  | jq -r '.data[] | "\(.traceID) \(([.spans[].duration]|max)/1000)ms [\([.processes[].serviceName]|unique|join(","))]"'

# trace-uri lente (minDuration accept─â 500ms / 2s / 1m)
curl -s -G "$J/api/traces" \
  --data-urlencode 'service=akadion-backend' \
  --data-urlencode 'minDuration=2s' \
  --data-urlencode 'lookback=1h' --data-urlencode 'limit=20' \
  | jq -r '.data[] | "\(.traceID) \(([.spans[].duration]|max)/1000)ms"'

# waterfall-ul unui trace: cine, c├ót, cu ce status
curl -s "$J/api/traces/<traceID>" | jq -r '
  .data[0] as $t | $t.spans | sort_by(.startTime)[] |
  "\($t.processes[.processID].serviceName)\t\(.operationName)\t\(.duration/1000)ms\t\(
    [.tags[]|select(.key|test("http.status_code|http.url|otel.status_code|error|db.statement"))
     |"\(.key)=\(.value)"]|join(" "))"' | column -ts$'\t'
```

Filtrare pe opera╚¢ie: `--data-urlencode 'operation=POST /chat'`
(listeaz─â opera╚¢iile cu `curl -s "$J/api/services/llm-response/operations"`).

## Maparea trace ΓåÆ lan╚¢ul real

Un `POST /api/conversatii/{id}/mesaje` s─ân─âtos produce **un singur trace**, cu span-uri ├«n ordinea:

```
akadion-backend  POST /api/conversatii/ΓÇª      ΓåÉ RequestIdFilter minte╚Öte request_id aici
  Γö£ΓöÇ akadion       (JDBC, salveazaIntrebare)
  ΓööΓöÇ llm-response  POST /chat                  basic auth ┬╖ 5s connect / 30s read
       Γö£ΓöÇ embedder  POST /api/query/embed      basic auth ┬╖ 30s
       Γö£ΓöÇ (Qdrant   search course_chunks)      10s
       Γö£ΓöÇ reranker  POST /api/rerank/chunks    F─éR─é auth ┬╖ 30s
       ΓööΓöÇ (Gemini   generate_content)          F─éR─é timeout ΓåÉ suspectul #1 la ΓÇ₧at├órn─â"
```

Ingest: `akadion-backend ΓåÆ embedder POST /api/documents/ingest` (120 s read, best-effort).

**Dac─â serviciile apar ├«n trace-uri separate ├«n loc de unul singur, propagarea `traceparent` e rupt─â**
ΓÇö verific─â asta ├«nainte de a concluziona c─â un serviciu ΓÇ₧nu a fost apelat".

Praguri utile: `/chat` > 30 s ΓåÆ a expirat timeoutul backendului (frontendul vede 502);
`/chat` blocat f─âr─â span de r─âspuns ΓåÆ cel mai probabil Gemini, singurul apel f─âr─â timeout.

## Capcane specifice acestei stive

- **Absen╚¢a trace-urilor cu eroare NU ├«nseamn─â c─â nu e nimic stricat.** Lan╚¢ul RAG are trei
  fallback-uri t─âcute care ├«ntorc **HTTP 200**: embedder/Qdrant c─âzut ΓåÆ `MOCK_DOCUMENTS`; reranker
  c─âzut ΓåÆ primele 5 contexte brute (raportat doar prin `print()`). Un lan╚¢ rupt arat─â ├«n Jaeger
  identic cu unul func╚¢ional. Dac─â r─âspunsul e suspect, verific─â `/api/health` la embedder ╚Öi
  `collections` la Qdrant direct, nu doar trace-urile.
- **Zgomot la pornire:** `embedder` produce span-uri `error=true` pentru `GET huggingface.co/... 404`
  (desc─ârcarea BGE-m3) ╚Öi backendul logheaz─â `Connection refused` spre Keycloak de 2ΓÇô3 ori.
  Ignor─â-le dac─â `http.url` e extern sau sunt din primele secunde de via╚¢─â ale containerului.
- **`DELETE /api/documents/ingest/{id}` returneaz─â mereu 404** (backendul cheam─â un path pe care
  embedderul nu-l expune). E o problem─â cunoscut─â, nu descoperirea ta.
- **reranker nu logheaz─â payload/r─âspuns pe `/api/rerank/chunks`** (ar inunda logul) ΓÇö vezi doar
  durata ╚Öi statusul.
- **Logurile serviciilor RAG se citesc din compose-ul lor**, nu din cel al backendului:
  `docker compose -f akadion-rag/compose.yaml logs --since 15m llm-response | grep <trace_id>`.
  Dac─â `docker` nu e disponibil ├«n mediul ├«n care rulezi (unele devcontainere nu ├«l expun),
  cere-i utilizatorului s─â ruleze comanda cu prefixul `!`.

## Referin╚¢─â rapid─â

| Vrei | Cum |
|---|---|
| lista serviciilor | `GET /api/services` |
| opera╚¢iile unui serviciu | `GET /api/services/{service}/operations` |
| trace-uri cu eroare | `GET /api/traces?service=X&tags={"error":"true"}&lookback=1h` |
| trace-uri lente | `ΓÇª&minDuration=2s` |
| un trace anume | `GET /api/traces/{traceID}` |
| de la Jaeger la log | `trace_id` din span ΓåÆ grep ├«n logul serviciului |
| de la un serviciu la altul, ├«n loguri | `request_id` (`X-Request-ID`) |
| ce e pornit, ce lipse╚Öte | `JAEGER-LOGGING.md` din r─âd─âcina acestui repo |
| contractele RAG, auth | `basic-auth-rag.md` din r─âd─âcina acestui repo |

Parametri suporta╚¢i pe `/api/traces`: `service`, `operation`, `tags` (JSON), `lookback`,
`start`/`end` (microsecunde epoch), `minDuration`, `maxDuration`, `limit`.