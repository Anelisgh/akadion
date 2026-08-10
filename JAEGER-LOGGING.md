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

## Partea de Python: `akadion-rag/` — copie, nu sursă

Ca lanțul să fie vizibil cap-coadă îți trebuie și instrumentarea celor trei servicii RAG, plus
containerul Jaeger. Amândouă sunt acum **pe acest branch**, în `akadion-rag/`:

| Cale | Sursa | Commit copiat |
|---|---|---|
| `akadion-rag/embedder/` | `teodoratirca13/embedder_service` | `941ced0` |
| `akadion-rag/reranker/` | `Radu2502/reranker-service` | `1ad10d5` |
| `akadion-rag/llm-response/` | `Steefyy/RAG_llm_response_service_Stefi` | `1706f69` |
| `akadion-rag/compose.yaml` | — | fișier de legătură, nu aparținea niciunui repo |

> ⚠️ **Cele trei foldere sunt o copie la un moment dat, nu sursa de adevăr.** Repo-urile de mai sus
> rămân locul unde se lucrează. Copia de aici nu se actualizează singură: dacă cineva împinge ceva
> în `embedder_service`, folderul din akadion rămâne la `941ced0` fără ca nimic să semnaleze asta.
> Modifică în repo-ul de origine și re-copiază, nu invers — altfel munca se pierde la prima
> resincronizare.

Ce aduce fiecare copie: `logging_setup.py` / `logging_ctx.py` / `middleware.py` (aproape identice
între cele trei — o modificare într-unul trebuie portată manual în celelalte două),
`opentelemetry-instrument` în fața lui uvicorn în `Dockerfile.multistage`, și în `compose.yaml`
`OTEL_SERVICE_NAME` plus aceleași variabile `OTEL_EXPORTER_OTLP_*` ca la backend.

`akadion-rag/compose.yaml` definește și containerul Jaeger — fără el backendul exportă spre o gazdă
inexistentă (nu crapă, dar nu vezi nimic):

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

Numele folderelor sunt load-bearing: `akadion-rag/compose.yaml` le referă drept `context:`. Nu sunt
numele implicite de la `git clone`.

## Cum verifici că merge

Ordinea contează: stiva principală creează rețeaua `akadion_shared`, pe care `akadion-rag` o
folosește ca `external: true`. Dacă lipsește: `docker network create akadion_shared`.

```bash
cp akadion-rag/llm-response/.env.example akadion-rag/llm-response/.env   # cerut via env_file

docker compose up -d --build                       # --build: agentul OTel intră în imagine
cd akadion-rag && docker compose up -d && cd ..

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
