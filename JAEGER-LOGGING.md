# Logging JSON + tracing Jaeger — ce e pe acest branch

Branch: `radu/jaeger-logging`, plecat din `main`.

Scopul: să vezi, pentru o cerere care a eșuat sau a durat, **în ce serviciu s-a rupt lanțul**
(Jaeger) și **de ce** (logurile JSON ale acelui serviciu).

Cele două lumi se leagă prin două chei:

- `trace_id` / `span_id` — injectate de agentul OpenTelemetry în logurile backendului
  (`OTEL_INSTRUMENTATION_LOGBACK_MDC_ENABLED=true`). **Join-ul Jaeger ↔ log.**
- `request_id` (header `X-Request-ID`, 16 hex) — generat sau preluat de `RequestIdFilter`,
  retrimis de interceptorul din `RagClientConfig` împreună cu `X-User` la fiecare apel RAG.
  **Join-ul log ↔ log**, între servicii.

## Ce conțin cele două commit-uri

**`79046d3` — logging JSON, correlation ID, user propagat**

| Fișier | Ce face |
|---|---|
| `config/RequestIdFilter.java` | acceptă sau generează `X-Request-ID`, îl pune în MDC și îl întoarce în răspuns |
| `config/AccessLogFilter.java` | o linie `http_request` per cerere: metodă, path, status, durată, user (email OIDC sau `anonymous`) |
| `config/RagClientConfig.java` | interceptor care retrimite `X-Request-ID` + `X-User` spre serviciile RAG |
| `resources/logback-spring.xml` | encoder Logstash → JSON cu chei `ts` / `msg` / `level` / `service` |
| `pom.xml` | `logstash-logback-encoder` 8.0 |
| `application.properties` | oprit `show-sql` și DEBUG-ul pe security/web (inundau logul JSON) |

Conține și o modificare care nu ține de logging: în `compose.yaml`, `minio-setup` folosea
`mc config host add`, comandă scoasă din `mc` — înlocuită cu `mc alias set`. A rămas în acest
commit; nu e o scăpare, doar nu e pe temă.

**`db36b5b` — tracing OpenTelemetry**

- `Dockerfile`: descarcă `opentelemetry-javaagent.jar` v2.30.0 și pornește cu `-javaagent:/otel.jar`
- `compose.yaml`: variabilele `OTEL_*` — export OTLP http/protobuf spre `http://jaeger:4318`,
  nume de serviciu `akadion-backend`

Instrumentarea e **exclusiv automată**. Nu există span-uri scrise de mână, deci span-urile poartă
doar atribute standard (`http.method`, `http.status_code`, `db.statement`). `request_id` și `X-User`
**nu apar în span-uri** — de aceea ai nevoie de ambele unelte, nu doar de Jaeger.

Traces only: `OTEL_METRICS_EXPORTER=none`, `OTEL_LOGS_EXPORTER=none`.

## Ce NU e pe acest branch și îți trebuie ca să meargă

**1. Containerul Jaeger.** Nu e definit aici, ci în `akadion-rag/compose.yaml` — fișierul care
leagă cele trei repo-uri RAG și care nu aparține niciunui repo. Fără el, backendul exportă spre o
gazdă inexistentă (nu crapă, dar nu vezi nimic). Blocul necesar:

```yaml
  jaeger:
    image: jaegertracing/all-in-one:1.60
    ports:
      - "16686:16686"   # UI + API
      - "4318:4318"     # OTLP http/protobuf
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
    networks:
      - rag_network
      - akadion_shared
```

**2. Partea de Python.** Logging-ul și tracing-ul serviciilor RAG stau în repo-urile lor, cu
commit-uri separate — `embedder`, `reranker`, `llm-response` au fiecare `tracing: OpenTelemetry
auto-instrumentation…` și câte un `feat(logging)…`. Fiecare serviciu are propria copie a
`logging_setup.py` / `logging_ctx.py` / `middleware.py`; sunt aproape identice, dar o modificare
într-unul trebuie portată manual în celelalte două.

Fiecare serviciu RAG mai are nevoie, în compose, de `OTEL_SERVICE_NAME` și de aceleași variabile
`OTEL_EXPORTER_OTLP_*`, plus `opentelemetry-instrument` în fața lui uvicorn.

Fără punctul 2, vezi în Jaeger doar span-urile backendului, iar lanțul pare să se termine la
primul apel RAG.

## Cum verifici că merge

```bash
cd akadion       && docker compose up -d --build   # --build: agentul OTel intră în imagine
cd ../akadion-rag && docker compose up -d

curl -s http://localhost:16686/api/services | jq -r '.data[]'
# așteptat: akadion-backend, llm-response, embedder, reranker
```

Trimite o întrebare din chat, apoi:

```bash
docker compose logs --since 5m backend | tail -5 | jq .
# fiecare linie: ts, level, msg, service, request_id, trace_id, span_id
```

Numele de serviciu din Jaeger (`akadion-backend`) diferă de cel din câmpul `service` al logurilor
(`backend`). Nu e o eroare de configurare.

## Skill-ul de debugging

`.claude/skills/jaeger-debug/SKILL.md` — se încarcă singur când lucrezi cu Claude Code în acest
repo și întrebi ceva de genul „de ce pică chat-ul" sau „de ce e lent". Conține interogările curl
gata scrise pentru API-ul Jaeger (trace-uri cu eroare, trace-uri lente, waterfall-ul unui trace),
maparea lanțului real de apeluri cu timeout-urile fiecărei verigi, și capcanele stivei.

Cea mai utilă parte e ultima: lanțul RAG are **trei fallback-uri tăcute care întorc HTTP 200**
(embedder/Qdrant căzut → documente mock, reranker căzut → primele 5 contexte brute). Un lanț rupt
arată în Jaeger identic cu unul funcțional, deci absența trace-urilor cu eroare nu dovedește nimic.
