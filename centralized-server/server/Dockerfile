FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# ---- deps stage: install only production deps ----
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ---- final stage ----
FROM base
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5000

# Cluster mode is handled inside server.js — just run it directly
CMD ["node", "server.js"]
