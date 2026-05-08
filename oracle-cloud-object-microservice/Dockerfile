FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# OCI SDK reads credentials from /root/.oci — mount via volume or secret at runtime
EXPOSE 8000

CMD ["node", "app.js"]
