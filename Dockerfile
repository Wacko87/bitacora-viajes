# Multi-stage Dockerfile for Bitácora de Viajes en Pareja
# Stage 1: Builder
FROM node:24-slim AS builder
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build Client PWA and Fastify Server
RUN npm run build

# Stage 2: Production Runner
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3040
ENV HOST=0.0.0.0
ENV DATA_DIR=/data

# Install curl for container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy only production dependencies and built assets
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Persistent SQLite and uploads directory
VOLUME ["/data"]

EXPOSE 3040

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:3040/api/health || exit 1

# Direct node invocation so POSIX SIGTERM is cleanly handled by process.on('SIGTERM')
CMD ["node", "dist/server/index.js"]
