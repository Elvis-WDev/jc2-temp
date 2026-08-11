# syntax=docker/dockerfile:1

# --- Dependencias ---------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack pnpm install --frozen-lockfile

# --- Compilacion ----------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Vite incrusta las variables VITE_* en el bundle en tiempo de BUILD, no de
# ejecucion. Por eso la URL de la API se pasa aqui como argumento y no como variable
# del contenedor: cambiarla despues no tendria ningun efecto.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN corepack pnpm build

# --- Ejecucion ------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
