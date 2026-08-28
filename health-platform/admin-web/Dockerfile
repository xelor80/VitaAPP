# --- Build-Stufe ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# API-Basis wird zur Build-Zeit in das Client-Bundle eingebettet.
ARG NEXT_PUBLIC_API_BASE="https://api.vitaguide.app/api/v1"
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Laufzeit-Stufe (standalone) ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
