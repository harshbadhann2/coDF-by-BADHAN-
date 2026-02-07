FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend ./
RUN npm run build

FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend ./

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
  libreoffice \
  libreoffice-writer \
  fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY --from=backend-builder /app/backend ./
COPY --from=frontend-builder /app/frontend/dist ./public

ENV NODE_ENV=production
EXPOSE 3030

CMD ["node", "server.js"]
