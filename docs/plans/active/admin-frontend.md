# Plan de implementación — Panel administrativo (frontend)

**Estado:** activo
**Alcance:** conectar el panel administrativo al backend. Las páginas públicas (Home,
Research, Teaching) se añadirán a **esta misma aplicación** en una fase posterior.
**Depende de:** [backend-mvp.md](backend-mvp.md) y [backend-gaps.md](backend-gaps.md)

---

## Qué hay hoy

La carpeta `frontend/` es **`shadcn-admin` v2.2.1**, una plantilla de panel de código
abierto. Aporta mucho ya resuelto y nada conectado.

**Sirve tal cual:** Vite + React 19, TanStack Router (rutas por archivos), TanStack
Query, TanStack Table, shadcn/ui sobre Radix, Tailwind v4, react-hook-form + Zod 4,
sonner, recharts, lucide-react, tema claro/oscuro, sidebar responsive, command palette,
páginas de error 401/403/404/500/503, y Vitest en modo navegador con Playwright.

**Lo que hay que revisar antes de construir encima:**

| Hallazgo | Consecuencia |
|---|---|
| **No existe cliente HTTP.** No hay instancia de axios ni interceptores; todos los datos son mocks estáticos (`features/users/data/users.ts` son 33 líneas de array) | La capa de datos hay que construirla entera |
| **Ninguna ruta está protegida.** `_authenticated/route.tsx` solo pinta el layout, sin `beforeLoad` | Toda pantalla "autenticada" es alcanzable sin sesión |
| **El login es simulado:** `auth.setAccessToken('mock-access-token')` | No hay autenticación real |
| **Modelo de auth incompatible.** El store guarda un bearer token en una cookie legible por JS | Nuestro backend usa cookie de sesión `HttpOnly` (ADR-0001), y SEC-002 prohíbe justo lo que hace la plantilla |
| **Clerk instalado y con rutas** (`routes/clerk/**`, `@clerk/react`) | Contradice ADR-0001; es peso muerto |
| Módulos de demostración (tasks, chats, apps, users) | No corresponden a nuestro dominio |

Nada de esto es un defecto de la plantilla: es una plantilla, y viene con un backend
ficticio. Pero conviene no confundir "el panel ya está" con "el panel ya funciona".

---

## 0. Dos decisiones antes de empezar

### 0.1. Una sola aplicación — DECIDIDO

El panel y las páginas públicas viven en la misma aplicación Vite. Primero el panel;
Home, Research y Teaching se añaden después como rutas públicas.

Consecuencia que queda anotada para cuando toque esa fase: `ERS.md` §39 pide
`<title>`, meta description, canonical, OpenGraph y JSON-LD Person, y una SPA entrega
un HTML vacío que se pinta con JavaScript. **No es un callejón sin salida**: cuando
lleguemos a las páginas públicas hay salidas razonables sin cambiar de framework —
prerenderizar las tres rutas en el build, o el prerender de Netlify (ya hay
`netlify.toml` en el repositorio). Se decide entonces, con las páginas delante.

No bloquea nada del panel, que es lo que cubre este plan.

### 0.2. Vite en lugar de Next.js

`stack.md:33` dice Next.js. Para un panel privado detrás de login el SSR no aporta nada:
no hay SEO que ganar y el arranque es irrelevante. La plantilla ya está elegida, trae
resuelto medio panel y funciona.

Requiere **ADR-0004**, que debe cubrir las dos partes: el panel (sin coste) y las
páginas públicas (con el coste de SEO descrito en 0.1 y las salidas previstas). Es la
misma disciplina que aplicamos con Better Auth y con el almacenamiento local.

---

## 1. Preparación

1. **Mover `frontend/` a `~/jc2-v2/web/`.** Hoy está en el disco NTFS, donde
   `pnpm install` tardaba más de 30 minutos y fallaba por falta de symlinks. En btrfs
   son segundos. El nombre `web/` empareja con `api/`.
2. **Desinstalar Clerk** y borrar `src/routes/clerk/**`, `src/features/clerk*` y el logo.
3. **Borrar los módulos de demostración**: `features/tasks`, `features/chats`,
   `features/apps`, y `features/users` en su forma actual (su tabla se reaprovecha como
   patrón, pero los datos y el dominio no valen).
4. Escribir **ADR-0004** (Vite en lugar de Next.js, panel y páginas públicas).
5. Alinear puertos: la API espera `CORS_ORIGIN`, y Vite sirve en `5173`. O se cambia el
   `.env` de la API a `http://localhost:5173`, o se fija el puerto de Vite en `3000`.

**Verificable:** `pnpm install && pnpm dev` arranca en segundos; `pnpm build` y
`pnpm lint` pasan sin los módulos borrados.

---

## 2. Capa de datos

Es lo que no existe y todo lo demás necesita.

1. **`src/lib/api-client.ts`** — instancia única de axios:
   - `baseURL` desde `VITE_API_URL`;
   - **`withCredentials: true`**, que es lo que envía la cookie de sesión. Sin esto no
     hay autenticación posible;
   - **sin cabecera `Authorization`**: no hay ningún token que el JavaScript pueda leer,
     y así debe seguir (SEC-002).
2. **Desempaquetado del envelope.** La API responde `{ data, meta }` y los errores
   `{ error: { code, message, fields, requestId } }`. Un interceptor de respuesta
   devuelve `data` directamente, y uno de error convierte el envelope en un
   `ApiError` tipado con `code`, `fields` y `requestId`.
3. **`handleServerError` reescrito** sobre ese `ApiError`: hoy adivina a partir del
   estado HTTP. Con nuestros códigos puede dar mensajes exactos —`WORK_VALIDATION_ERROR`,
   `TAG_ALREADY_EXISTS`, `MEDIA_IN_USE`— y mostrar el `requestId` cuando sea un 500,
   que es para lo que existe.
4. **Errores de campo a react-hook-form.** El `fields` de la API se vuelca en
   `form.setError`, de modo que un 422 del backend pinta el error **junto al campo** y
   no en un toast genérico.
5. **`src/lib/api/types.ts`** — tipos de respuesta. Se derivan a mano del contrato; más
   adelante se pueden generar desde `/openapi.json`, que ya existe.
6. **Claves de React Query** centralizadas (`queryKeys.works.list(filtros)`), para que
   invalidar tras una mutación no dependa de recordar la clave exacta.

**Verificable:** una llamada real a `/api/admin/tags` pinta datos; un 409 de tag
duplicado muestra el mensaje del backend; un 422 marca el campo.

---

## 3. Autenticación real

1. **Tirar `auth-store` tal como está.** No debe guardar ningún token: con cookie
   `HttpOnly` el JavaScript no puede ni leerla, que es justo la garantía que buscamos.
   El store queda solo con el usuario en memoria.
2. **`useSession()`** sobre `GET /api/admin/auth/get-session` de Better Auth. Es la
   única fuente de verdad de "hay sesión".
3. **Guard real en `_authenticated/route.tsx`**: un `beforeLoad` que resuelve la sesión
   y redirige a `/sign-in?redirect=…` si no hay. Hoy no existe.
4. **Login contra `POST /api/admin/auth/sign-in/email`**, sustituyendo el token
   simulado. Un 429 se traduce a "demasiados intentos", que es lo que devuelve el rate
   limit de SEC-003.
5. **Logout** contra `POST /api/admin/auth/sign-out` y limpieza de la caché de Query.
6. **Borrar registro, OTP y recuperación de contraseña** (`sign-up`, `otp`,
   `forgot-password`). El backend no los expone: `disableSignUp: true` y sin OTP por
   decisión explícita. Dejar los formularios sería prometer algo que no existe.

### Detalle de despliegue que hay que decidir pronto

La cookie de Better Auth va con `SameSite=Lax`. En desarrollo, `localhost:5173` y
`localhost:4000` son el mismo sitio a efectos de cookies (el puerto no cuenta), así que
funciona. En producción:

- **misma dominio por rutas** (`app.example.com/` y `app.example.com/api`, que es la
  primera opción de `deployment.md:36-52`): funciona igual;
- **subdominios distintos** (`app.` y `api.`): hace falta `SameSite=None; Secure`, que
  es otra configuración y otra exposición a CSRF.

La primera opción es más simple y más segura. Conviene fijarla ahora y no al desplegar.

**Verificable:** sin sesión, `/` redirige a `/sign-in`; con credenciales del `.env` se
entra; recargar mantiene la sesión; logout la corta; una cookie caducada devuelve a
login sin bucle.

---

## 4. Componentes compartidos — HECHO

`lint`, `tsc` y 104 tests en verde. Dos correcciones sobre lo planificado:

- **Los filtros en la URL ya existían.** La plantilla trae `use-table-url-state`, que
  cubre paginación, filtro global y filtros de columna. No había que escribirlo.
- **`MediaPicker` se traslada a la fase C.** Necesita los tipos y endpoints del módulo
  de archivos; construirlo aquí obligaría a inventar su contrato dos veces.

Lo añadido: `AppDataTable` (modo cliente y modo servidor), `EntityPickerDialog`,
`SortableList`, `EmptyState` y el hook `use-debounced-value`.


La plantilla ya trae casi todo el inventario que pide `component-system.md:17-38`:
tabla con TanStack Table, toolbar, paginación, visibilidad de columnas, acciones de
fila, diálogos, confirmación, toasts, sidebar y cabecera. **No se reescriben**: se
extraen del módulo `users` a `src/components/`, se tipan de forma genérica y se
documenta su contrato.

Lo que falta y hay que añadir:

- `AppDataTable<T>` con **paginación de servidor**: la de la plantilla es de cliente, y
  nuestra API pagina en el servidor (PERF-001).
- Filtros sincronizados con la URL (`data-tables.md:40-47`), para que un listado
  filtrado se pueda compartir por enlace.
- `MediaPicker` — seleccionar o subir un archivo, con `purpose` y `visibility`. Lo usan
  works, courses, perfil, instituciones y páginas.
- `EntityPickerDialog` para autores, tags e instituciones: buscador con tabla, no un
  campo donde escribir un UUID (`forms-and-workflows.md:32-45`).
- `SortableList` para reordenar destacados y autores.

**Verificable:** dos módulos distintos usan la misma tabla sin copiarla, y el filtro
sobrevive a recargar la página.

---

## 5. Módulos administrativos — EN CURSO

Hechos: **Tags**, **Tipos de trabajo**, **Instituciones** (con `DepartmentSelect`).
`lint`, `tsc` y 104 tests en verde.

**Works** (fase D) hecho también: listado con acciones de ciclo de vida y formulario
de página completa del ERS §33. Con él se escribieron los clientes de API de
**personas** y **media**, que Works necesitaba.

De la fase E: **Dashboard** (ERS §51) y **Registro de auditoría** hechos, y el
**Perfil académico** que quedaba de la fase C.

Pendientes: **Cursos y ediciones**, **Contenido de páginas**, **Configuración del
sitio**, la pantalla de **Media** y la de **Autores** — el cliente de API de estas dos
últimas ya existe. Del formulario de Works faltan las secciones de enlaces, archivos
adjuntos y etiquetas.

Ninguno se ha probado contra la API: PostgreSQL sigue sin levantar.


En orden de dependencia: lo que otros módulos necesitan para poder seleccionarlo va
primero. La barra lateral sigue `ERS.md` §35.

| Orden | Módulo | Endpoints | Nota |
|---|---|---|---|
| 1 | Tags | `/tags` | El 409 debe ofrecer "usar el existente" con el `existingTagId` que devuelve la API |
| 2 | Tipos de trabajo | `/work-types` | El `code` se muestra como solo lectura tras crearlo |
| 3 | Instituciones y departamentos | `/institutions`, `/departments` | El selector de departamento se filtra por institución: RN-006 no debería poder ni intentarse desde la interfaz |
| 4 | Media | `/media` | Subida con progreso, previsualización, y el 409 de archivo en uso mostrando quién lo usa |
| 5 | Perfil académico | `/profile`, `/person-links`, `/affiliations` | Tres pestañas |
| 6 | Autores | `/persons` | Selector reutilizable por works |
| 7 | **Works** | `/works` + publish/archive/featured | El más grande: ver sección 5.1 |
| 8 | Cursos y ediciones | `/courses`, `/course-offerings`, `/course-materials` | Curso y ediciones en una sola pantalla: separarlos haría creer que el curso pertenece a una institución |
| 9 | Contenido de páginas | `/page-content` | Editor Markdown con previsualización |
| 10 | Configuración | `/site-settings` | Incluye los interruptores de secciones de Home |
| 11 | Dashboard | `/dashboard` | Métricas y accesos rápidos (ERS §51) |
| 12 | Audit log | `/audit-log` | Solo lectura, con filtros |

### 5.1. Formulario de Work

`ERS.md` §33 lo detalla. Es una **página completa, no un modal**: tiene secciones,
listas ordenables y ciclo de vida borrador/publicado
(`forms-and-workflows.md:5-16`).

Secciones: básico, autores (ordenables, con corresponding), contenido y tags,
publicación (venue, volumen, DOI…), links, archivos, cita (con previsualización
generada y overrides), presentación (destacado y orden) y editorial.

Dos cosas que la interfaz debe hacer bien porque el backend las exige:

- **Publicar sin autores da 422.** El botón se deshabilita con la razón visible, en
  lugar de dejar que el usuario lo pulse y reciba un error.
- **Destacar exige publicado** (RN-003). Mismo criterio.

---

## 6. Navegación, calidad y cierre — PARCIAL

Hecho: barra lateral según ERS §35 (fase A), selector de equipos retirado, módulo de
demostración `users` eliminado, `EmptyState` con las cuatro variantes del ERS §55, y
tests de los dos flujos con reglas de negocio detrás — el 409 de etiqueta duplicada y
el bloqueo de publicar/destacar. Dockerfile con nginx y `try_files` para el enrutado
del cliente.

Pendiente: recorrer `docs/quality/frontend-checklist.md` (teclado, foco, claro/oscuro,
móvil, textos largos, 200% de zoom). Eso hay que hacerlo con el panel funcionando
contra la API.


1. Reescribir `sidebar-data.ts` con la estructura de `ERS.md` §35 y **dos niveles como
   máximo** (`navigation-responsive.md`).
2. Quitar el selector de equipos (`team-switcher`): hay un solo sitio y un solo
   administrador.
3. Estados vacíos según `ERS.md` §55, distinguiendo "no hay nada aún" de "los filtros no
   devuelven resultados".
4. Recorrer `docs/quality/frontend-checklist.md`: teclado, foco, claro/oscuro, móvil,
   textos largos, 200% de zoom.
5. Tests de los flujos que importan: login y redirección, publicar un work sin autores,
   subir un archivo, el 409 de tag duplicado.
6. Dockerfile del panel y build de producción.

---

## Orden de trabajo

Los pasos 1 a 4 son cimientos y van seguidos. A partir del 5, cada módulo es entregable
por separado y se puede ver funcionando.

| Fase | Contenido | Esfuerzo aproximado |
|---|---|---|
| A | Preparación + capa de datos + auth real | 1 día |
| B | Componentes compartidos | medio día |
| C | Módulos 1-6 (catálogos, media, perfil) | 1,5 días |
| D | Works | 1 día |
| E | Cursos, páginas, configuración, dashboard, audit | 1 día |
| F | Navegación, estados, checklist, tests | medio día |

---

## Requisito previo

Nada de esto se puede probar de verdad hasta que la API corra contra PostgreSQL. La
fase A necesita un backend vivo desde el primer momento: sin él, el login no se puede
verificar y volveríamos a acumular código sin ejecutar, que es justo lo que pasó con las
siete fases del backend.

---

## Auditoría de criterios por módulo (11 ago 2026)

Revisión de los diez criterios contra **todos** los módulos, no solo los tocados en los
puntos 1-6. Se hizo porque la revisión anterior comprobó los módulos uno a uno y dio por
bueno el conjunto; el conjunto no lo estaba.

### A. Recursos de la API sin ninguna pantalla

| Recurso | Estado |
| --- | --- |
| `/departments` | cliente escrito, sin pantalla: `createDepartment`, `updateDepartment` y `deleteDepartment` no se importan en ningún sitio |
| `/affiliations` | enlace en el menú → 404 |
| `/person-links` | enlace en el menú → 404 |
| `/courses` | enlace en el menú → 404 |
| `/course-offerings` | sin pantalla |
| `/course-materials` | sin pantalla |
| `/page-content` | enlace en el menú → 404 |
| `/site-settings` | enlace en el menú → 404 |

Cinco entradas del menú lateral llevan a una ruta que no existe.

### B. Módulos con el CRUD incompleto

- **Archivos**: se sube, se ve y se borra, pero no se modifica. `updateMediaMetadata`
  está escrito y no se usa: no hay forma de renombrar, poner texto alternativo ni
  cambiar la visibilidad de algo ya subido.
- **Perfil**: solo lee y guarda los datos personales. Las afiliaciones y los enlaces
  forman parte del perfil y no tienen pantalla.

### C. Criterios aplicados solo en parte

- **No se puede reactivar nada.** Ningún módulo ofrece volver a activar lo que se
  ocultó: el botón queda deshabilitado y no hay acción inversa. Ningún formulario expone
  `isActive`. La API sí lo admite (probado: 200 en instituciones, tipos de trabajo y
  etiquetas). El hueco es solo del panel.
- **Doble confirmación solo al borrar.** Ocultar una institución, ocultar un tipo de
  trabajo y archivar un trabajo se ejecutan al primer clic. Al no poder deshacerse desde
  el panel, son justamente las que más la necesitan.
- **Filtros solo en Trabajos.** Instituciones y Etiquetas aceptan filtro por estado (y
  Etiquetas por categoría) en la API y el panel no los ofrece. Auditoría acepta cinco
  (`entityType`, `entityId`, `userId`, `from`, `to`) y no ofrece ninguno. Archivos no
  tiene filtros ni en la API: su listado solo acepta paginación.
- **Perfil no avisa igual que el resto.** Usa `useMutation` en crudo; al fallar muestra
  un texto dentro del formulario en lugar del toast flotante de los demás módulos.

### D. Criterios que sí se cumplen en todo el panel

- Ninguna pestaña en ninguna pantalla.
- La misma tabla en los siete módulos que listan datos (Tipos de trabajo pagina en
  memoria por ser un catálogo corto; el resto, contra el servidor).
- Doble confirmación en todos los borrados.
- Insignias de color en todos los listados.
- Modales de alta y edición en Instituciones, Autores, Etiquetas, Tipos de trabajo y
  Archivos. Trabajos y Perfil siguen siendo páginas completas: pendiente de decisión.
- Sin jerga en pantalla. Las referencias a la ERS están solo en comentarios de código.
