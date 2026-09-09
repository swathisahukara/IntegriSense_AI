# =============================================================================
# IntegriSense AI — Production Dockerfile
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json ./
RUN npm install --ignore-scripts

COPY src/ ./src/
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/server.js"]
