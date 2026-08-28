#!/bin/sh
set -e

echo "→ Prisma-Migration (deploy)…"
node node_modules/prisma/build/index.js migrate deploy

echo "→ Optionaler Seed (nur wenn SEED_ON_START=true)…"
if [ "$SEED_ON_START" = "true" ]; then
  # Vorkompilierten Seed direkt mit node ausführen (kein ts-node nötig).
  node dist/prisma-seed/seed.js || echo "Seed übersprungen/fehlgeschlagen (nicht kritisch)."
fi

echo "→ Backend starten…"
exec node dist/main.js
