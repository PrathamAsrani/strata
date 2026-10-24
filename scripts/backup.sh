#!/bin/sh
# Copies everything Strata keeps (map, history, proposals, accounts) out of the Docker volume into ./backups/.
# Usage: ./scripts/backup.sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
out="backups/strata-$(date +%Y%m%d-%H%M%S).tar.gz"
docker compose exec -T strata tar -C /data -czf - --exclude=./backups . > "$out"
echo "Saved $out ($(wc -c < "$out") bytes)"
