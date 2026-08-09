# Logging JSON + tracing Jaeger ΓÇö ce e pe acest branch

Branch: `radu/jaeger-logging`, plecat din `main`.

Scopul: s─â vezi, pentru o cerere care a e╚Öuat sau a durat, **├«n ce serviciu s-a rupt lan╚¢ul**
(Jaeger) ╚Öi **de ce** (logurile JSON ale acelui serviciu).

Cele dou─â lumi se leag─â prin dou─â chei:

- `trace_id` / `span_id` ΓÇö injectate de agentul OpenTelemetry ├«n logurile backendului
  (`OTEL_INSTRUMENTATION_LOGBACK_MDC_ENABLED=true`). **Join-ul Jaeger Γåö log.**
- `request_id` (header `X-Request-ID`, 16 hex) ΓÇö generat sau preluat de `RequestIdFilter`,
  retrimis de interceptorul din `RagClientConfig` ├«mpreun─â cu `X-User` la fiecare apel RAG.
  **Join-ul log Γåö log**, ├«ntre servicii.

## Ce con╚¢in cele dou─â commit-uri

**`79046d3` ΓÇö logging JSON, correlation ID, user propagat**

| Fi╚Öier | Ce face |
|---|---|
| `config/RequestIdFilter.java` | accept─â sau genereaz─â `X-Request-ID`, ├«l pune ├«n MDC ╚Öi ├«l ├«ntoarce ├«n r─âspuns |
| `config/AccessLogFilter.java` | o linie `http_request` per cerere: metod─â, path, status, durat─â, user (email OIDC sau `anonymous`) |
| `config/RagClientConfig.java` | interceptor care retrimite `X-Request-ID` + `X-User` spre serviciile RAG |
| `resources/logback-spring.xml` | encoder Logstash ΓåÆ JSON cu chei `ts` / `msg` / `level` / `service` |
| `pom.xml` | `logstash-logback-encoder` 8.0 |
| `application.properties` | oprit `show-sql` ╚Öi DEBUG-ul pe security/web (inundau logul JSON) |

Con╚¢ine ╚Öi o modificare care nu ╚¢ine de logging: ├«n `compose.yaml`, `minio-setup` folosea
`mc config host add`, comand─â scoas─â din `mc` ΓÇö ├«nlocuit─â cu `mc alias set`. A r─âmas ├«n acest
commit; nu e o sc─âpare, doar nu e pe tem─â.

**`db36b5b` ΓÇö tracing OpenTelemetry**

- `Dockerfile`: descarc─â `opentelemetry-javaagent.jar` v2.30.0 ╚Öi porne╚Öte cu `-javaagent:/otel.jar`
- `compose.yaml`: variabilele `OTEL_*` ΓÇö export OTLP http/protobuf spre `http://jaeger:4318`,
  nume de serviciu `akadion-backend`

Instrumentarea e **exclusiv automat─â**. Nu exist─â span-uri scrise de m├ón─â, deci span-urile poart─â
doar atribute standard (`http.method`, `http.status_code`, `db.statement`). `request_id` ╚Öi `X-User`
**nu apar ├«n span-uri** ΓÇö de aceea ai nevoie de ambele unelte, nu doar de Jaeger.

Traces only: `OTEL_METRICS_EXPORTER=none`, `OTEL_LOGS_EXPORTER=none`.

## Ce NU e pe acest branch ╚Öi ├«╚¢i trebuie ca s─â mearg─â

**1. Containerul Jaeger.** Nu e definit aici, ci ├«n `akadion-rag/compose.yaml` ΓÇö fi╚Öierul care
leag─â cele trei repo-uri RAG ╚Öi care nu apar╚¢ine niciunui repo. F─âr─â el, backendul export─â spre o
gazd─â inexistent─â (nu crap─â, dar nu vezi nimic). Blocul necesar:

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

**2. Partea de Python.** Logging-ul ╚Öi tracing-ul serviciilor RAG stau ├«n repo-urile lor, cu
commit-uri separate ΓÇö `embedder`, `reranker`, `llm-response` au fiecare `tracing: OpenTelemetry
auto-instrumentationΓÇª` ╚Öi c├óte un `feat(logging)ΓÇª`. Fiecare serviciu are propria copie a
`logging_setup.py` / `logging_ctx.py` / `middleware.py`; sunt aproape identice, dar o modificare
├«ntr-unul trebuie portat─â manual ├«n celelalte dou─â.

Fiecare serviciu RAG mai are nevoie, ├«n compose, de `OTEL_SERVICE_NAME` ╚Öi de acelea╚Öi variabile
`OTEL_EXPORTER_OTLP_*`, plus `opentelemetry-instrument` ├«n fa╚¢a lui uvicorn.

F─âr─â punctul 2, vezi ├«n Jaeger doar span-urile backendului, iar lan╚¢ul pare s─â se termine la
primul apel RAG.

## Cum verifici c─â merge

```bash
cd akadion       && docker compose up -d --build   # --build: agentul OTel intr─â ├«n imagine
cd ../akadion-rag && docker compose up -d

curl -s http://localhost:16686/api/services | jq -r '.data[]'
# a╚Öteptat: akadion-backend, llm-response, embedder, reranker
```

Trimite o ├«ntrebare din chat, apoi:

```bash
docker compose logs --since 5m backend | tail -5 | jq .
# fiecare linie: ts, level, msg, service, request_id, trace_id, span_id
```

Numele de serviciu din Jaeger (`akadion-backend`) difer─â de cel din c├ómpul `service` al logurilor
(`backend`). Nu e o eroare de configurare.

## Skill-ul de debugging

`.claude/skills/jaeger-debug/SKILL.md` ΓÇö se ├«ncarc─â singur c├ónd lucrezi cu Claude Code ├«n acest
repo ╚Öi ├«ntrebi ceva de genul ΓÇ₧de ce pic─â chat-ul" sau ΓÇ₧de ce e lent". Con╚¢ine interog─ârile curl
gata scrise pentru API-ul Jaeger (trace-uri cu eroare, trace-uri lente, waterfall-ul unui trace),
maparea lan╚¢ului real de apeluri cu timeout-urile fiec─ârei verigi, ╚Öi capcanele stivei.

Cea mai util─â parte e ultima: lan╚¢ul RAG are **trei fallback-uri t─âcute care ├«ntorc HTTP 200**
(embedder/Qdrant c─âzut ΓåÆ documente mock, reranker c─âzut ΓåÆ primele 5 contexte brute). Un lan╚¢ rupt
arat─â ├«n Jaeger identic cu unul func╚¢ional, deci absen╚¢a trace-urilor cu eroare nu dovede╚Öte nimic.