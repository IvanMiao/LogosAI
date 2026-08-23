FROM node:22-bookworm-slim AS frontend-build

WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM node:22-bookworm-slim

WORKDIR /workspace/cloudflare

COPY cloudflare/package.json cloudflare/package-lock.json ./
RUN npm ci

COPY cloudflare/ ./
COPY --from=frontend-build /workspace/frontend/dist /workspace/frontend/dist

EXPOSE 8787

CMD ["sh", "./docker-entrypoint.sh"]
