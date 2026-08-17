#!/usr/bin/env bash
# Porneste toata infrastructura akadion cu o singura comanda: stiva principala
# (compose.yaml) + stiva RAG (rag/compose.yaml).
#
# NU le combin intr-un singur "docker compose -f compose.yaml -f rag/compose.yaml up" -
# desi pare mai curat, Compose rezolva caile relative (ex. env_file din rag/compose.yaml)
# fata de directorul primului fisier, nu al fiecaruia, si llm-response nu-si mai gaseste
# .env-ul. Doua comenzi separate, fiecare cu propriul context, chiar functioneaza.
#
# Ruleaza pe Linux/Mac direct, si pe Windows prin Git Bash: ./start-akadion.sh
#
# NU rula manual rag/embedder/docker-compose.yml sau rag/reranker/compose.yaml in paralel cu
# acest script - sunt variante "solo", doar pentru dezvoltare izolata pe un singur
# microserviciu, si folosesc aceleasi porturi ca stiva rag/compose.yaml de mai jos.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if ! docker network inspect akadion_shared >/dev/null 2>&1; then
  echo "Creez reteaua akadion_shared..."
  docker network create akadion_shared
else
  echo "Reteaua akadion_shared exista deja."
fi

echo
echo "=== Pornesc stiva principala: postgres, keycloak, minio, backend, frontend, jaeger ==="
docker compose -f compose.yaml up --build -d

echo
echo "=== Pornesc stiva RAG: qdrant, embedder, reranker, llm-response ==="
docker compose -f rag/compose.yaml up --build -d

cat <<EOF

Gata.
  Frontend:  http://localhost:5173
  Backend:   http://localhost:8081
  Keycloak:  http://localhost:8080
  Jaeger UI: http://localhost:16686
  RAG chat:  http://localhost:8000

Pentru loguri: docker compose -f compose.yaml logs -f    sau    docker compose -f rag/compose.yaml logs -f
Pentru oprire: ./stop-akadion.sh
EOF
