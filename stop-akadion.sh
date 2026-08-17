#!/usr/bin/env bash
# Opreste toata infrastructura pornita de start-akadion.sh. Reteaua akadion_shared ramane
# (e externa - nu se sterge automat la oprire).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

docker compose -f rag/compose.yaml down
docker compose -f compose.yaml down

echo
echo "Gata. Reteaua akadion_shared a ramas (docker network rm akadion_shared daca nu mai ai nevoie de ea)."
