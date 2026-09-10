# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `next build` statically analyzes every route (including API routes like
# /api/health) to decide static-vs-dynamic rendering, which imports
# src/db/index.ts — and that throws immediately if DATABASE_URL is unset, so
# the build needs *some* syntactically valid value even though no query ever
# actually runs at build time (postgres.js connects lazily). The real value
# comes from docker-compose.yml's `environment:`/`env_file:` at container
# start, which overrides this build-time-only placeholder.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build \
  && npm run build:server

# ---------------------------------------------------------------------------
# Minimal runtime image. `next build` with output:"standalone" traces exactly
# the node_modules the Next.js server needs into .next/standalone; the
# migrate/worker bundles are fully self-contained (see scripts/build-server.mjs),
# so nothing else from node_modules has to be copied in.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/drizzle ./drizzle

USER app
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# Run pending migrations, then start the Next.js server. The `worker`
# service in docker-compose.yml overrides this CMD to run dist-server/worker.js
# instead.
CMD ["sh", "-c", "node dist-server/migrate.js && node server.js"]
