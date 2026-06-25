# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
# Skip optional native deps (better-sqlite3/sqlite-vec); add the pure-JS pg
# client used by the neon driver. Keeps the build toolchain-free.
RUN npm ci --omit=optional && npm install --no-save pg@^8.13.0
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ─── Runtime stage ──────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --omit=optional && npm install --no-save pg@^8.13.0 \
    && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
# Liveness probe — GET /api/health (node's global fetch; no curl in the slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
