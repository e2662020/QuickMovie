# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-builder
RUN apk add --no-cache python3 make g++ sqlite-dev
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache nginx sqlite-libs

COPY --from=frontend-builder /app/dist /app/dist

COPY --from=server-builder /app/server/dist /app/server/dist
COPY --from=server-builder /app/server/node_modules /app/server/node_modules
COPY --from=server-builder /app/server/package*.json /app/server/
WORKDIR /app/server

COPY docker/nginx.conf /etc/nginx/http.d/default.conf

COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80 3001
CMD ["/app/start.sh"]
