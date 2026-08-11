# Plan de implementación — Backend MVP

**Estado:** activo
**Alcance:** solo backend (`api/`). Sin frontend.

## Progreso

| Fase | Estado |
|---|---|
| 0 — ADRs y limpieza | Hecho. ADR-0001/0002/0003 escritos, AWS SDK desinstalado |
| 1 — Cimientos | **Verificada.** `pnpm verify` en verde |
| 2 — BD y auth | Código completo y verificado estáticamente. **Falta aplicar la migración contra PostgreSQL**: requiere Docker arrancado |
| 3 — Media | Código completo. Almacenamiento y detección de tipo verificados con pruebas de integración reales sobre disco. Falta el paso por PostgreSQL |
| 4 — Perfil, instituciones y páginas | Código completo. RN-006, RN-007 y RN-008 verificadas con pruebas. Falta el paso por PostgreSQL |
| 5 — Research | Código completo. Dominio (DOI, slug, invariantes, BibTeX) y casos de uso verificados. Búsqueda full-text y facets **sin ejecutar**: dependen de PostgreSQL |
| 6 — Teaching | Código completo. RN-004, RN-005 y el XOR de materiales verificados. Filtros y facets **sin ejecutar**: dependen de PostgreSQL |
| 7 — Home y cierre | Código completo. Saneado de Markdown, cache y OpenAPI verificados. Home y dashboard **sin ejecutar**: dependen de PostgreSQL |

`pnpm verify` en verde: 156 tests, lint con reglas de frontera, typecheck y build.

**Las siete fases están escritas.** Lo que queda no es código nuevo, es ejecutar todo
contra PostgreSQL por primera vez y recorrer los criterios de aceptación del ERS §58.

**Deuda acumulada:** ninguna de las fases 2 a 4 ha corrido contra PostgreSQL. La migración
inicial sigue sin aplicarse, así que el SQL de las restricciones personalizadas y todas
las consultas Prisma están sin ejecutar ni una vez.

> El proyecto se movió de `/media/elvis/disco2/Outliers-solutions/jc2-v2` a `~/jc2-v2`.
> El disco original es NTFS y no soporta symlinks: `pnpm install` tardaba más de 30
> minutos y fallaba con `ERR_PNPM_SYMLINK_FAILED`. En btrfs tarda 8 segundos.

**Fuente de verdad funcional:** `ERS.md`
**Fuente de verdad técnica:** `AGENTS.md`, `docs/architecture/`, `docs/quality/`, `docs/security/`

---

## 0. Decisiones que se apartan del ERS

Cada una necesita un ADR en `docs/architecture/adr/` antes de codificar (`definition-of-done.md:13`).

| # | Tema | ERS dice | Hacemos | Por qué |
|---|---|---|---|---|
| ADR-0001 | Auth | Tabla `users` propia con `password_hash` + Argon2id (§7, SEC-003) | Better Auth es dueño de usuario, sesión, hashing y tablas | `AGENTS.md:57` y `stack.md:49-52` lo prohíben explícitamente sin ADR |
| ADR-0002 | Archivos | S3 / R2 / MinIO (§10) | Disco local detrás de un puerto `StorageProvider` | Requisito explícito del cliente. El puerto deja el cambio a S3 sin tocar casos de uso |
| ADR-0003 | Refresh token | `POST /api/admin/auth/refresh` (§32) | No existe; Better Auth renueva la sesión por cookie | No hay tokens que refrescar en el modelo de sesión por cookie |

**Consecuencia de ADR-0001 sobre el modelo de datos:** la tabla `users` del ERS §7 desaparece. Better Auth aporta `user`, `session`, `account`, `verification`. Los campos `role`, `is_active`, `last_login_at` se añaden como *additional fields* del modelo `user` de Better Auth. Las FK `works.created_by`, `works.updated_by`, `media_assets.uploaded_by`, `audit_log.user_id`, `page_content.updated_by`, `site_settings.updated_by` apuntan a `user.id`.

**Consecuencia de ADR-0002:** `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner` quedan sin uso. Desinstalarlos (`AGENTS.md:62`: no dependencias de producción sin justificar) y reintroducirlos el día que se escriba el adaptador S3.

---

## 1. Arquitectura de carpetas

Cuatro capas, dependencias siempre hacia adentro. Los módulos son los de `NFR-001`: auth, people, research, teaching, institutions, media, pages, settings.

```text
api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│       ├── index.ts            # orquestador idempotente
│       ├── work-types.seed.ts  # catálogo ERS §14
│       ├── page-content.seed.ts# home/research/teaching ERS §25
│       ├── site-settings.seed.ts
│       └── admin-user.seed.ts  # lee .env, usa la API de Better Auth
│
├── storage/                    # NO versionado. STORAGE_ROOT por defecto
│   ├── tmp/                    # destino de multer antes de validar
│   ├── public/
│   └── private/
│
└── src/
    ├── domain/                 # cero imports de framework, ORM o HTTP
    │   ├── shared/             # value objects: Doi, Slug, Uuid, Year, Email
    │   ├── errors/             # DomainError y subclases
    │   ├── research/           # Work, WorkAuthor, WorkType, Tag + invariantes
    │   ├── teaching/           # Course, CourseOffering, CourseMaterial
    │   ├── people/             # Person, Affiliation, PersonLink
    │   ├── institutions/       # Institution, Department
    │   ├── media/              # MediaAsset, FileKind, Visibility
    │   └── pages/              # PageContent, SiteSettings
    │
    ├── application/            # orquesta dominio; no conoce Express ni Prisma
    │   ├── ports/              # interfaces que la infraestructura implementa
    │   │   ├── repositories/   # WorkRepository, PublicWorkRepository, ...
    │   │   ├── StorageProvider.ts
    │   │   ├── AuditLogger.ts
    │   │   ├── Clock.ts
    │   │   ├── IdGenerator.ts
    │   │   └── UnitOfWork.ts
    │   ├── dto/                # entrada/salida de casos de uso
    │   └── use-cases/
    │       ├── research/       # CreateWork, PublishWork, ListPublicWorks, ...
    │       ├── teaching/
    │       ├── media/          # UploadMedia, DeleteMedia, ReplaceMedia
    │       └── ...
    │
    ├── infrastructure/
    │   ├── database/prisma/
    │   │   ├── client.ts
    │   │   ├── repositories/   # implementan los puertos
    │   │   ├── mappers/        # registro Prisma <-> entidad de dominio
    │   │   └── PrismaUnitOfWork.ts
    │   ├── storage/local/
    │   │   ├── LocalStorageProvider.ts
    │   │   └── paths.ts        # construcción y validación de rutas
    │   ├── auth/better-auth/
    │   │   ├── auth.ts         # instancia configurada
    │   │   └── seedAdmin.ts
    │   ├── logging/logger.ts   # pino
    │   ├── audit/PrismaAuditLogger.ts
    │   └── search/             # SQL de búsqueda full-text
    │
    ├── interfaces/http/        # única capa que conoce Express
    │   ├── middlewares/
    │   ├── routes/
    │   │   ├── public/         # solo lectura
    │   │   └── admin/          # requiere sesión
    │   ├── controllers/
    │   ├── schemas/            # Zod de request y response + registro OpenAPI
    │   ├── presenters/         # entidad -> DTO público, con whitelist
    │   └── openapi/
    │
    ├── config/
    │   └── env.ts              # validación Zod del entorno, falla al arrancar
    │
    └── main/                   # composition root
        ├── container.ts        # construye e inyecta las dependencias
        ├── app.ts              # arma Express
        └── server.ts           # escucha
```

### Regla de dependencia, verificable

`domain` ← `application` ← `infrastructure` / `interfaces` ← `main`

- `domain` no importa nada de las otras tres capas ni de `node_modules` salvo utilidades puras.
- `application` importa solo `domain` y sus propios puertos. **Nunca** `@prisma/client`, `express` ni `fs`.
- Los casos de uso reciben dependencias por constructor. Nada de singletons importados.

Se hace cumplir con una regla ESLint `no-restricted-imports` por capa, más un test que recorre los imports. No es una convención opcional: es lo que hace posible cambiar disco local por S3 sin tocar lógica.

---

## 2. Contratos transversales

Se implementan en la Fase 1 porque todo lo demás depende de ellos.

### 2.1. Envelope de respuesta

Éxito: `{ "data": ..., "meta": { ... } }` — `backend.md:58`
Error: `{ "error": { "code", "message", "fields"?, "requestId" } }` — ERS §48

### 2.2. Taxonomía de errores

Una clase base `AppError` con `code`, `httpStatus`, `fields?`, `isOperational`. El middleware de errores es el **único** punto que traduce a HTTP.

| Clase | HTTP | code |
|---|---|---|
| `ValidationError` | 422 | `*_VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `*_NOT_FOUND` |
| `ConflictError` | 409 | `*_CONFLICT` |
| `RateLimitError` | 429 | `RATE_LIMITED` |
| resto | 500 | `INTERNAL_ERROR` |

Un 500 nunca filtra el mensaje original al cliente: se registra con `requestId` y se devuelve texto genérico (`feedback-and-states.md:73`, ERS §42).

### 2.3. Paginación

`page >= 1`, `pageSize` por defecto 20 y máximo 100 (ERS §47). Un solo helper `paginate()` que devuelve `{ items, pagination: { page, pageSize, totalItems, totalPages } }`. Ningún endpoint de listado se escribe a mano.

### 2.4. Validación

Un middleware `validate({ params, query, body })` con Zod. Ninguna ruta lee `req.body` sin pasar por él. Los tipos del handler salen inferidos del esquema, no declarados a mano.

### 2.5. OpenAPI

Los mismos esquemas Zod se registran en `@asteasolutions/zod-to-openapi` y generan `/openapi.json`; `/docs` lo sirve con `swagger-ui-express` (NFR-003). Al derivarse de los esquemas que ya validan, no puede desincronizarse de la implementación.

### 2.6. Logging y requestId

`pino-http` asigna `X-Request-Id` (o respeta el entrante), y registra método, ruta, status, latencia y usuario admin cuando exista (ERS §42). Redacción obligatoria de `authorization`, `cookie`, `set-cookie`, `password`.

---

## 3. Autenticación

Better Auth con **solo** email + contraseña. Sin OTP, sin 2FA, sin magic link, sin OAuth, sin registro público.

```text
emailAndPassword: { enabled: true }
signUp: deshabilitado — no se expone ninguna ruta de registro
```

- Adaptador Prisma, sobre la misma base de datos.
- Cookies `httpOnly`, `secure` en producción, `sameSite=lax`, `path=/`.
- El handler de Better Auth se monta en `/api/admin/auth/*` **antes** de `express.json()` (`backend.md:67`), porque necesita el cuerpo crudo.
- Rate limiting específico en login: por IP y por email (SEC-003). Más estricto que el global.
- `trustedOrigins` = `CORS_ORIGIN`, explícito, sin comodines.

### Middleware `requireAdmin`

Resuelve la sesión, carga el usuario, verifica `is_active` y `role === 'admin'`, y adjunta `req.auth = { userId, role }`. Si falla → 401. Se aplica **al router `/api/admin` entero**, no ruta por ruta, para que sea imposible olvidarlo en un endpoint nuevo.

### Seeder del administrador

`prisma/seed/admin-user.seed.ts`, idempotente, ejecutable en producción:

1. Lee `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` del entorno; si falta alguno, aborta con mensaje claro.
2. Valida longitud mínima de contraseña (`authentication.md:38`).
3. Si el email ya existe → no hace nada y sale con éxito (re-ejecutable en cada despliegue).
4. Si no existe → lo crea **a través de la API de Better Auth**, nunca escribiendo el hash a mano.
5. No registra la contraseña en logs.

`.env.example` lleva placeholders, jamás valores reales (`security/principles.md:19-24`).

---

## 4. Gestión de archivos en local

Es la parte con más superficie de ataque, así que va detallada.

### 4.1. El puerto

```text
StorageProvider {
  save(input: { stream, visibility, detectedExt }): Promise<{ storageKey, sizeBytes, checksum }>
  openRead(storageKey): Promise<ReadableStream>
  delete(storageKey): Promise<void>
  exists(storageKey): Promise<boolean>
}
```

`LocalStorageProvider` lo implementa contra `STORAGE_ROOT`. Los casos de uso solo conocen la interfaz.

### 4.2. Defensa contra path traversal — estructural, no por saneado

**Ninguna ruta HTTP acepta nunca un nombre de archivo ni una ruta.** El cliente solo envía un **UUID de `media_assets`**; el backend busca el `storage_key` en la base de datos y desde ahí resuelve. El atacante no controla ningún segmento de la ruta, así que `../` no tiene por dónde entrar.

Como segunda barrera, `paths.ts` resuelve y comprueba antes de tocar el disco:

```text
const abs = path.resolve(STORAGE_ROOT, key)
if (!abs.startsWith(STORAGE_ROOT + path.sep)) throw new ForbiddenError()
```

y rechaza claves con `..`, byte nulo o ruta absoluta.

### 4.3. `storage_key` generada por el servidor

Formato: `{visibility}/{yyyy}/{mm}/{uuid}{ext}`, por ejemplo `private/2026/08/3f2a....pdf`.

- El `uuid` lo genera el servidor.
- La extensión sale del **tipo detectado**, no del nombre subido.
- `original_filename` se guarda solo como metadato para mostrar; nunca se usa para construir rutas.
- Particionar por año/mes evita directorios con decenas de miles de entradas.

### 4.4. Flujo de subida

1. `multer` con `diskStorage` hacia `storage/tmp/`, `limits.fileSize` y `limits.files = 1`.
2. Detectar el MIME **por magic bytes** con `file-type`, ignorando `Content-Type` y la extensión (SEC-005).
3. Contrastar contra una allowlist por propósito. Si no coincide → borrar el temporal y 422.
4. Calcular SHA-256 mientras se lee (`checksum_sha256`, ERS §10) para integridad y deduplicación.
5. `rename()` del temporal a su ubicación final — atómico dentro del mismo filesystem, por eso `tmp/` vive bajo `STORAGE_ROOT`.
6. Insertar la fila de `media_assets`. Si el insert falla → borrar el archivo. Si el `rename` falla → borrar el temporal.
7. Barrido de huérfanos programado, para reconciliar disco y base de datos ante cortes bruscos.

Allowlist inicial:

| Propósito | MIME permitidos | Tamaño máx. |
|---|---|---|
| `paper_pdf`, `appendix`, `supplement`, `slides` | `application/pdf` | 25 MB |
| `cover`, `figure` | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| `code_archive`, `data_archive` | `application/zip` | 50 MB |
| CV, foto de perfil | pdf / jpeg / png / webp | 10 MB |

**SVG queda fuera de la allowlist**: puede contener `<script>` y se ejecutaría en el origen del sitio.

### 4.5. Entrega de archivos

Nada de `express.static` sobre `STORAGE_ROOT`. Dos rutas controladas:

- `GET /api/public/media/:id` — consulta `media_assets`, exige `is_public = true` **y** que la fila que lo referencia (`work_files` / `course_materials`) también sea pública y pertenezca a contenido con `editorial_status = 'published'`. Si no → 404, nunca 403 (un 403 confirmaría que el archivo existe).
- `GET /api/admin/media/:id/download` — requiere sesión de administrador. Único camino a los privados.

Cabeceras obligatorias en ambas:

```text
X-Content-Type-Options: nosniff
Content-Type: <el MIME almacenado, nunca uno enviado por el cliente>
Content-Disposition: attachment; filename*=UTF-8''<nombre saneado>
Cache-Control: public, max-age=..., immutable   (solo en las públicas)
```

`inline` se permite únicamente para `application/pdf` y las imágenes rasterizadas de la allowlist. Todo lo demás se descarga.

> En producción tras nginx se puede delegar el envío con `X-Accel-Redirect` conservando la comprobación de permisos en Node. Optimización posterior, no del MVP.

### 4.6. Borrado y sustitución

**Borrado** (ERS §32, §50): antes de borrar se cuentan las referencias en `work_files`, `course_materials`, `persons.photo_media_id`, `persons.cv_media_id`, `page_content.hero_media_id`, `site_settings.og_image_media_id`, `institutions.logo_media_id`, `works.cover_media_id`, `courses.cover_media_id`. Si hay alguna → **409** con la lista de quién lo usa. Solo con `?force=true` explícito se desreferencia y se borra. El archivo del disco se elimina **después** de confirmar la transacción de base de datos; al revés se perdería el archivo si el commit falla.

**Sustitución**: los archivos son inmutables. "Modificar" es subir uno nuevo, repuntar la referencia y borrar el viejo si queda sin referencias. Nunca se reescriben bytes en una `storage_key` existente — así las cabeceras de caché inmutable siguen siendo correctas y no hay carrera entre lectores y escritores.

Los metadatos editables (`alt_text`, `caption`, `credit`, `is_public`) sí se actualizan por `PATCH`, sin tocar el binario.

### 4.7. Permisos en disco

`STORAGE_ROOT` fuera del árbol de código y fuera de cualquier ruta servida estáticamente. Directorios `0750`, archivos `0640`, propiedad del usuario que ejecuta el proceso. En Docker, volumen dedicado que sobrevive al redespliegue (`deployment.md:66`).

---

## 5. Blindaje de los endpoints públicos

Cuatro capas independientes; que una falle no basta para filtrar datos.

**1. Read-only por construcción.** El router `/api/public` monta un middleware que rechaza con 405 cualquier método distinto de `GET`/`HEAD` (SEC-004), antes de resolver ruta alguna.

**2. El filtro de publicación vive en el repositorio, no en el controlador.** Interfaces separadas: `PublicWorkRepository` y `AdminWorkRepository`. Toda consulta de la variante pública lleva `editorial_status = 'published'` incrustado en su implementación. El controlador no puede olvidarlo porque no tiene forma de expresarlo. Es el punto más importante del apartado: RN-001 deja de depender de la disciplina de quien programa.

**3. Presenters con whitelist explícita.** Nunca `res.json(entity)`. Cada respuesta pública pasa por un presenter que enumera campos uno a uno. Así no se escapan `created_by`, `updated_by`, `archived_at`, `editorial_status`, rutas de almacenamiento ni links y archivos con `is_public = false` (`frontend.md:60-65`, ERS §60.14).

**4. Tests que lo verifican.** En la Fase 6, pero se escriben junto a cada endpoint:

- un `work` en `draft` responde 404 en las rutas públicas;
- un `work_link` con `is_public = false` no aparece en el detalle público;
- un archivo privado devuelve 404 sin sesión;
- un test recorre la tabla de rutas y afirma que ninguna pública acepta métodos de escritura;
- un test de presenter comprueba que la respuesta no contiene ninguna clave de una lista negra de campos internos.

Además: CORS explícito por origen sin comodines, `helmet` con cabeceras por defecto, rate limiting global más uno específico en login y en subidas (SEC-007).

---

## 6. Fases

Cada fase termina con `corepack pnpm verify` en verde y su documentación actualizada (`definition-of-done.md`).

### Fase 1 — Cimientos

1. `tsconfig.json` con `strict: true` (NFR-002), ESLint con las reglas de frontera entre capas, Prettier.
2. `config/env.ts`: esquema Zod del entorno; el proceso no arranca si falta algo (`AGENTS.md:60`).
3. `logger` pino + `pino-http` con requestId y redacción.
4. `AppError`, middleware de errores, envelope, `paginate()`, middleware `validate()`.
5. `app.ts`: helmet, cors, rate limit, montaje de routers, 404 y manejador de errores al final.
6. `GET /health` (`bootstrap.md:35`) y arranque del registro OpenAPI.
7. Docker Compose con PostgreSQL para desarrollo local.

**Verificable:** el servidor levanta, `/health` responde, `/docs` carga vacío, un error provocado devuelve el envelope correcto con `requestId`.

### Fase 2 — Base de datos y auth

1. `schema.prisma` completo: las 20 tablas del ERS §7-27 menos `users`, más los modelos de Better Auth.
   - `@@map` a `snake_case`, `@default(uuid(7))`, `@db.Timestamptz`.
   - Índices de ERS §15 y §23.
   - Restricciones que Prisma no expresa (un solo `is_site_owner`, un único `site_settings`, el XOR de `course_materials`) van como SQL crudo dentro de la migración.
2. Primera migración. Seed de `work_types` (12 valores), `page_content` (home/research/teaching) y `site_settings`.
3. Better Auth + adaptador Prisma + `requireAdmin` + rate limit de login.
4. Seeder del administrador desde `.env`.
5. `PrismaUnitOfWork` para transacciones (ERS §49).
6. `PrismaAuditLogger` (ERS §27).

**Verificable:** login con las credenciales del `.env` devuelve cookie de sesión; `/api/admin/auth/me` responde; sin cookie da 401; la migración corre limpia desde cero.

### Fase 3 — Media

Se adelanta a Research porque works y courses dependen de ella.

1. Puerto `StorageProvider` + `LocalStorageProvider` + `paths.ts` con los tests de traversal.
2. Casos de uso: `UploadMedia`, `DeleteMedia`, `UpdateMediaMetadata`, `GetMediaForDownload`.
3. `POST /api/admin/media/upload`, `PATCH /api/admin/media/:id`, `DELETE /api/admin/media/:id`, `GET /api/admin/media`, `GET /api/admin/media/:id/download`, `GET /api/public/media/:id`.
4. Comprobación de referencias antes de borrar.
5. Script de barrido de huérfanos.

**Verificable:** se sube un PDF y aparece bajo `STORAGE_ROOT` con nombre generado; un `.exe` renombrado a `.pdf` se rechaza; un archivo privado da 404 sin sesión; borrar un archivo en uso da 409.

### Fase 4 — Perfil, instituciones y páginas

1. Dominio y repositorios de `persons`, `person_links`, `institutions`, `departments`, `affiliations`.
2. Regla RN-006 / §13: el departamento debe pertenecer a la institución. Se valida en el dominio, no en el controlador.
3. RN-007 y RN-008: no borrar instituciones ni personas referenciadas; desactivar en su lugar.
4. `page_content` y `site_settings` (singleton).
5. `GET /api/public/profile`.

**Verificable:** asignar un departamento de otra institución devuelve 422; borrar una institución en uso devuelve 409.

### Fase 5 — Research

1. Dominio `Work` con sus invariantes: RN-002 (un autor mínimo para publicar), RN-003 (destacado ⇒ publicado), RN-009 (normalización de DOI), RN-010 (slug estable), rango de `publication_year` (§15).
2. Escritura compuesta y transaccional: work + autores + tags + links + archivos (ERS §49).
3. Generación de cita y BibTeX, con `citation_text_override` y `bibtex_override` por delante (RF-010).
4. Búsqueda: `tsvector` sobre título, subtítulo, abstract, venue y publisher, **más join a autores y tags** — RF-011 y §46 los exigen y el índice de §15 no los cubre. Se resuelve con una columna `search_vector` mantenida por trigger que concatene también autores y tags.
5. `GET /api/public/research` con filtros combinables, orden (RF-012), paginación y **facets**.
6. `GET /api/public/research/:id` con la versión completa; el listado devuelve la resumida (PERF-002).
7. CRUD admin + `publish` / `archive`.

**Verificable:** publicar sin autores da 422; un DOI con prefijo se persiste normalizado; cambiar el título no cambia el slug ya publicado; los filtros combinan y las facets cuadran con los resultados.

### Fase 6 — Teaching

1. `Course` sin `institution_id` ni `department_id` — es la decisión central del ERS §2.4 y §21.
2. `CourseOffering` con institución, departamento opcional, término, año, rol y `is_active`.
3. RN-005: una offering no publica si su curso está archivado.
4. `CourseMaterial` con el XOR entre `media_id` y `external_url` (§24).
5. `GET /api/public/teaching` con filtros y facets, `GET /api/public/teaching/:courseId`.
6. CRUD admin de courses, offerings y materiales.

**Verificable:** una offering cambia de institución sin duplicar el curso; el filtro `active=true` funciona; los materiales privados no salen en la respuesta pública.

### Fase 7 — Home y cierre

1. `GET /api/public/home` agregado en una sola consulta y cacheable (§30, PERF-003).
2. `ETag` y `Cache-Control` en las GET públicas (PERF-004).
3. Endpoint de métricas del dashboard (§51).
4. Saneado de Markdown al renderizar (§37) con `sanitize-html` sobre la salida de `marked`.
5. OpenAPI completo en `/openapi.json` y `/docs`.
6. Cobertura de tests de NFR-004, backups documentados (§43), Dockerfile y healthcheck.

**Verificable:** la lista completa de criterios del ERS §58.

---

## 7. Tests

Pirámide de `docs/quality/testing.md` con Vitest y Supertest:

- **Unitarios de dominio** sin base de datos: invariantes de `Work`, normalización de DOI, estabilidad de slug, regla departamento-institución, generación de BibTeX.
- **Casos de uso** con repositorios en memoria — los puertos hacen esto trivial.
- **Integración** contra PostgreSQL real (contenedor desechable): repositorios, filtros, facets, paginación, transacciones y rollback.
- **HTTP** con Supertest: auth, permisos, códigos de estado, forma del envelope de error.
- **Seguridad**, los de la sección 5 más: traversal, magic bytes, límites de tamaño, rate limit de login.

---

## 8. Variables de entorno

`.env.example` con placeholders; el real nunca se versiona (`deployment.md:27-30`).

```text
NODE_ENV=development
PORT=4000
DATABASE_URL=replace-with-url
BETTER_AUTH_SECRET=replace-with-secret
BETTER_AUTH_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000
ADMIN_EMAIL=replace-with-email
ADMIN_PASSWORD=replace-with-secure-password
ADMIN_NAME=replace-with-name
STORAGE_ROOT=./storage
PUBLIC_BASE_URL=http://localhost:4000
MAX_UPLOAD_BYTES=52428800
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| NTFS sin symlinks ni permisos POSIX reales | `nodeLinker: hoisted` ya aplicado. Los modos `0640` de la sección 4.7 **no se cumplirán en desarrollo**; solo aplican en Linux/Docker. No confiar en ellos localmente |
| Disco local no escala ni sobrevive a varias réplicas | El puerto `StorageProvider` mantiene el cambio a S3 acotado a un archivo |
| Trigger de `search_vector` fuera del control de Prisma | Va en SQL crudo dentro de una migración versionada, nunca aplicado a mano (NFR-005) |
| Better Auth se aparta del `users` del ERS | ADR-0001 lo documenta antes de escribir código |

---

## 10. Orden de arranque

1. Escribir ADR-0001, ADR-0002 y ADR-0003.
2. Desinstalar los dos paquetes de AWS.
3. Rellenar `docs/product/overview.md` y `docs/product/domain-model.md` a partir del ERS, y sustituir `{{PROJECT_NAME}}` en `AGENTS.md:5`.
4. Fase 1.
