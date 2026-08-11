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
# El cliente Prisma es codigo generado: se produce aqui, nunca se versiona.
RUN corepack pnpm exec prisma generate && corepack pnpm build

# --- Dependencias de produccion ------------------------------------------
FROM node:24-alpine AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack pnpm install --frozen-lockfile --prod

# --- Migraciones y seed ---------------------------------------------------
#
# Imagen aparte, de un solo uso. Lleva el CLI de Prisma —que es dependencia de
# desarrollo— y el seed compilado. La imagen de ejecucion se queda sin ninguna de las
# dos cosas: un contenedor que sirve peticiones no tiene por que poder migrar la base.
FROM node:24-alpine AS migrate
WORKDIR /app
ENV NODE_ENV=production

# `--chown` en cada copia: el contenedor corre como `node` y con los ficheros de root
# cualquier cosa que quiera escribir en /app falla con EACCES.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
# Desde Prisma 7 la cadena de conexion sale de aqui, no del esquema: sin este fichero
# `migrate deploy` no sabe contra que base trabajar.
COPY --chown=node:node prisma.config.ts package.json ./

USER node

# Se llama al CLI de Prisma **directamente**, sin pnpm de por medio.
#
# Con `corepack pnpm exec` fallaba en el servidor: pnpm comprueba si node_modules cuadra
# con el lockfile antes de ejecutar nada y, al no cuadrar, lanza un `install` que escribe
# un temporal en /app. Como `node` no es dueño del directorio, moria con
# `EACCES: permission denied, open '/app/_tmp_...'`. Aqui no hay nada que instalar: las
# dependencias vienen de la etapa `deps`.
#
# `migrate deploy` aplica lo que falte y no genera nada: es el unico comando de Prisma
# que se puede correr contra produccion. El seed va detras y es idempotente.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/infrastructure/database/seed/index.js"]

# --- Ejecucion ------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# El cliente generado vive dentro de dist/, asi que viaja con el build.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# STORAGE_ROOT debe montarse como volumen: si vive en la capa del contenedor, cada
# redespliegue borraria los archivos subidos (deployment.md:63-66).
RUN mkdir -p /data/storage && chown -R node:node /data/storage
ENV STORAGE_ROOT=/data/storage
VOLUME ["/data/storage"]

# Sin root: si el proceso cae, el atacante no hereda privilegios del sistema.
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Las variables llegan del entorno del orquestador, no de un .env dentro de la imagen.
CMD ["node", "dist/main/server.js"]
