# ADR 0002: Almacenamiento de archivos en disco local

## Status

Accepted

## Context

`ERS.md` §10 indica que el binario de los archivos debe vivir en S3, Cloudflare R2,
MinIO o equivalente, y que no se guarde dentro de PostgreSQL.

El cliente pidió explícitamente gestionar los archivos en local: subida, borrado y
sustitución sobre el disco del servidor.

Un portfolio académico de una sola persona mueve pocos archivos y un único proceso
los sirve, así que el almacenamiento de objetos no aporta nada hoy. Pero atarse al
disco en la lógica de negocio haría caro el cambio el día que haga falta.

## Decision

Los binarios se guardan en el disco local, bajo `STORAGE_ROOT`, detrás de un puerto
`StorageProvider` definido en la capa de aplicación.

- `LocalStorageProvider` es la única implementación por ahora.
- Los casos de uso solo conocen la interfaz: `save`, `openRead`, `delete`, `exists`.
- `media_assets` sigue siendo el registro de metadatos, igual que en el ERS.
- Se mantiene la regla del ERS §10 de no guardar binarios en PostgreSQL.
- `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner` se desinstalan mientras no
  exista adaptador S3, por `AGENTS.md:62`.

Las medidas de seguridad asociadas están en
`docs/plans/active/backend-mvp.md` sección 4: claves de almacenamiento generadas por
el servidor, detección de MIME por magic bytes, rutas controladas en lugar de
servido estático, y archivos inmutables.

## Consequences

- Positiva: cumple el requisito del cliente sin ensuciar dominio ni casos de uso.
- Positiva: cambiar a S3 o R2 es escribir un segundo adaptador y una línea en el
  contenedor de dependencias.
- Negativa: el disco local no se comparte entre réplicas. Mientras dure esta
  decisión, la API corre en una sola instancia.
- Negativa: el backup de archivos deja de ser el versionado de un bucket y pasa a
  ser responsabilidad del despliegue (`ERS.md` §43).
- Negativa: los archivos los sirve Node en lugar de un CDN. Aceptable a este
  volumen; delegable a nginx con `X-Accel-Redirect` sin tocar los casos de uso.
- Seguimiento: el volumen de `STORAGE_ROOT` debe sobrevivir al redespliegue
  (`docs/architecture/deployment.md:63-66`).
