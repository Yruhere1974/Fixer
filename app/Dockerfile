# syntax=docker/dockerfile:1

# --- deps: install node_modules (cached unless lockfile changes) ---
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
# Skip postinstall (prisma generate) here — the schema isn't copied yet; the builder runs it.
RUN npm ci --ignore-scripts

# --- builder: generate Prisma client + build Next standalone output ---
# This stage is also used as the `migrate` service image (it has the full Prisma CLI + deps).
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Placeholder only to satisfy startup env validation during the build. Pages are dynamic and
# make no DB connection at build time; the real DATABASE_URL is injected at runtime by compose.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN npm run build

# --- runner: minimal runtime image (serves only; migrations run in the migrate service) ---
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
