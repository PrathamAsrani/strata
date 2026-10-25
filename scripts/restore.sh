#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Puts a backup back, then restarts the app.
# Usage: ./scripts/restore.sh backups/strata-20261024-120000.tar.gz   (map, history, proposals, accounts)
#        ./scripts/restore.sh some-file.json                          (map only: a db.json or an "Export JSON" file)
set -eu
cd "$(dirname "$0")/.."
file="${1:?Give the backup file to restore}"
[ -f "$file" ] || { echo "File not found: $file" >&2; exit 1; }
printf 'This replaces the current data with %s. Type yes to continue: ' "$file"
read -r answer
[ "$answer" = "yes" ] || { echo "Cancelled."; exit 1; }
"$(dirname "$0")/backup.sh"
case "$file" in
  *.tar.gz|*.tgz) docker compose exec -T strata tar -C /data -xzf - < "$file" ;;
  *) docker compose cp "$file" strata:/data/db.json ;;
esac
docker compose restart strata
echo "Restored. The data you replaced was saved in ./backups just before."
