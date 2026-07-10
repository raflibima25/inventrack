# syntax=docker/dockerfile:1

# ============================================================
# InvenTrack - Next.js 16 + Prisma 7 (driver adapter, no engine binary)
# App-only image: Postgres & MinIO run externally (Supabase / VPS).
# ============================================================

# ------------------------------------------------------------
# 1) deps: install node_modules (postinstall runs `prisma generate`,
#    so prisma/ must exist before `npm ci`)
# ------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# prisma needs openssl to detect libssl version (silences a runtime warning)
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# prisma.config.ts requires DATABASE_URL to just load (postinstall runs `prisma generate`,
# which doesn't need a real connection) — dummy value is enough at build time.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

# ------------------------------------------------------------
# 2) builder: build the Next.js app
# ------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Public/build-time values baked into the client bundle.
# Override at build time with --build-arg.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG MINIO_HOSTNAME=storage.yourdomain.com
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV MINIO_HOSTNAME=${MINIO_HOSTNAME}
ENV NEXT_TELEMETRY_DISABLED=1
# same dummy DATABASE_URL — prisma generate doesn't connect, just needs the config to load
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# regenerate prisma client (generated/ is gitignored, not copied from host)
RUN npx prisma generate
RUN npm run build

# ------------------------------------------------------------
# 3) runner: minimal runtime image
# ------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# non-root user (image already ships "node" user/group)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

USER node
EXPOSE 3000

CMD ["node", "server.js"]
