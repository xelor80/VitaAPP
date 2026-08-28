# --- Build-Stufe ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Build-Tools für native Module (argon2), openssl für Prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build
# Seed nach reinem JS vorkompilieren, damit er zur Laufzeit ohne ts-node läuft
# (ts-node ist eine Dev-Abhängigkeit und im schlanken Prod-Image nicht als
# PATH-Binary verfügbar → `prisma db seed` schlug bisher mit ENOENT fehl).
RUN npx tsc prisma/seed.ts --outDir dist/prisma-seed \
  --module commonjs --target ES2021 --moduleResolution node \
  --esModuleInterop --skipLibCheck

# --- Laufzeit-Stufe ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json tsconfig.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
# Wendet beim Start die Migrationen an und startet die API (inkl. In-Process-Worker).
CMD ["./docker-entrypoint.sh"]
