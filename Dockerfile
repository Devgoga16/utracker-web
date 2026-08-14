# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: nginx ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# URL del backend, se puede sobreescribir en runtime: -e API_URL=http://api:4000
ENV API_URL=http://api:4000

# nginx procesa el template con envsubst al arrancar
COPY nginx.conf /etc/nginx/templates/default.conf.template

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# El entrypoint oficial de nginx:alpine ya corre envsubst sobre /etc/nginx/templates/
CMD ["nginx", "-g", "daemon off;"]
