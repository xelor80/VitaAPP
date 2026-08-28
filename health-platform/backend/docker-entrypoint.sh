#!/bin/sh
set -e

echo "→ Prisma-Migration (deploy)…"
node node_modules/prisma/build/index.js migrate deploy

echo "→ Optionaler Seed (nur wenn SEED_ON_START=true)…"
if [ "$SEED_ON_START" = "true" ]; then
  node node_modules/prisma/build/index.js db seed || echo "Seed übersprungen/fehlgeschlagen (nicht kritisch)."
fi

echo "→ Backend starten…"
exec node dist/main.js
