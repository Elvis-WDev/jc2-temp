# Plan de implementación — Cierre de huecos del backend

**Estado:** activo
**Depende de:** [backend-mvp.md](backend-mvp.md), cuyas siete fases están escritas
**Alcance:** solo backend. Sin frontend.

Cierra los tres huecos detectados al revisar lo implementado contra `ERS.md` §31, RF-007
y §9. Son cuatro pasos independientes entre sí, ordenados por lo que bloquea a lo que
solo molesta.

---

## Paso 1 — Tags (bloqueante) — HECHO

`pnpm verify` en verde con 169 tests, 13 de ellos sobre la regla de deduplicación.
Pendiente de ejecutar contra PostgreSQL, como el resto del backend.


### Por qué

`ERS.md` §31 lista `/tags` entre los recursos administrativos y RF-007 exige gestión
centralizada. Hoy los endpoints de works y courses aceptan `tagIds`, pero **no existe
ninguna forma de crear un tag** y el seeder no crea ninguno: `tagIds` solo puede ir
vacío. La funcionalidad es inalcanzable de punta a punta, y el criterio del ERS §58
"puede añadir tags" es hoy imposible de cumplir.

### Qué se hace

1. `TagRepository` en `application/ports/repositories/` con `list`, `findBySlug`,
   `create`, `update`, `delete`, `countUsage`.
2. `PrismaTagRepository`. `countUsage` cuenta `work_tags` + `course_tags`.
3. `TagUseCases` con la regla que da sentido a RF-007:
   - el slug se deriva del nombre con el mismo `generateSlug` que ya usan works y
     courses;
   - si el slug ya existe, se responde **409 con el id del tag existente**, no se crea
     un duplicado. Es exactamente el caso que RF-007 quiere evitar: `Behavioral
     Economics`, `behavioral economics` y `Behavioral economics` colapsan al mismo
     slug y el administrador reutiliza el que ya hay;
   - borrar un tag en uso responde 409 con el recuento, salvo `?force=true`. Sin esto
     el `onDelete: Cascade` del esquema desharía asociaciones en silencio.
4. Rutas admin `GET/POST /api/admin/tags`, `PATCH`/`DELETE /api/admin/tags/:id`.
5. Seed de un conjunto inicial de tags a partir de `ERS.md` §17 (Microeconomic Theory,
   Mechanism Design, Behavioral Economics, Auctions, Political Economy, Revenue
   Equivalence, Dynamic Models), idempotente como el resto de seeds.

### Decisión que conviene fijar

Los works **no crean tags al vuelo** a partir de nombres sueltos: reciben `tagIds` de
tags que ya existen. Aceptar nombres libres sería más cómodo de programar y reintroduce
justo la proliferación que RF-007 prohíbe.

### Verificable

- Crear `Behavioral Economics` y después `behavioral economics` devuelve 409 con el id
  del primero.
- Borrar un tag usado por un trabajo devuelve 409; con `force=true` se borra y el
  trabajo pierde esa asociación.
- Un work creado con `tagIds` los devuelve en `GET /api/public/research/:id`.

---

## Paso 2 — Ampliar los formatos de archivo aceptados — HECHO

`pnpm verify` en verde con 204 tests. Se añadió ODF además de lo planificado, y el
criterio "un `.html` renombrado a `.csv` se rechaza" resultó estar mal enunciado: se
acepta como texto y se sirve como `text/csv` adjunto, que es inofensivo. La barrera
real es que un archivo **llamado** `.html` sí se rechaza.


### Por qué

La lista blanca actual acepta PDF, JPEG/PNG/WebP y ZIP. `ERS.md` §9 pide tipos
`slides`, `data_archive` y `code_archive`, y un economista trabaja con `.pptx`, `.xlsx`,
`.csv`, `.tex`, `.bib`, `.do` y `.tar.gz`. Hoy todos reciben 422. El enfoque de lista
blanca es correcto; está mal calibrada.

### El problema técnico de fondo

La detección por magic bytes funciona con binarios pero **no con texto plano**. Un
`.csv`, un `.tex` o un `.bib` no tienen firma: `file-type` devuelve `null` y el diseño
actual los rechaza. No es un descuido que se arregle añadiendo MIMEs a una lista: hacen
falta dos caminos distintos.

**Camino binario** (sin cambios de diseño, solo más entradas):

| Formato | MIME detectado | Nota |
|---|---|---|
| `.docx`, `.xlsx`, `.pptx` | `application/vnd.openxmlformats-officedocument.*` | Son contenedores ZIP; `file-type` mira dentro y los distingue |
| `.tar.gz`, `.gz` | `application/gzip` | |
| `.gif` | `image/gif` | Para figuras |

Los formatos Office **heredados** (`.doc`, `.xls`, `.ppt`) quedan fuera: son
contenedores OLE y `file-type` los reporta todos como `application/x-cfb`, sin poder
distinguir un documento de una hoja de cálculo. Aceptarlos significaría aceptar
cualquier OLE, incluidos los que llevan macros.

**Camino texto** (diseño nuevo, en `domain/media/TextFormatPolicy.ts`):

1. `file-type` no reconoce nada → candidato a texto.
2. El contenido decodifica como UTF-8 y no contiene bytes nulos en los primeros 64 KB.
3. La **extensión del nombre original** está en la lista blanca de texto del propósito.
4. Límite de tamaño más bajo (5 MB).

Aquí la extensión sí influye en la clave de almacenamiento, al contrario que en el
camino binario. Es una desviación deliberada del principio "la extensión sale del tipo
detectado" y hay que documentarla: con texto plano no hay tipo detectado del que
sacarla. El riesgo se acota porque la extensión se valida contra la lista blanca, así
que `.html`, `.svg` y `.js` no pasan.

**Entrega:** todo el camino texto se sirve siempre con `Content-Disposition: attachment`
y nunca inline, con `X-Content-Type-Options: nosniff` que ya está.

### Propósitos resultantes

Reemplazan a los tres actuales y se corresponden con los tipos de `ERS.md` §9:

| Propósito | Acepta | Máx. |
|---|---|---|
| `document` | pdf, docx | 25 MB |
| `slides` | pdf, pptx | 50 MB |
| `image` | jpeg, png, webp, gif | 5 MB |
| `dataset` | xlsx, csv, tsv, json | 50 MB |
| `archive` | zip, tar.gz | 100 MB |
| `source` | tex, bib, r, do, py, m, txt, md | 5 MB |

`MAX_UPLOAD_BYTES` sube a 100 MB para dar cabida a `archive`.

### Riesgo que hay que aceptar por escrito

Un `.csv` puede contener fórmulas que Excel ejecuta al abrirlo (CSV injection). No es
un vector contra este backend —se sirve como descarga, no se interpreta— pero sí contra
quien lo abra. Mitigación razonable a este alcance: servirlos siempre como adjunto y no
transformarlos nunca. Neutralizar las fórmulas alteraría datos de investigación, que es
peor que el riesgo.

### Verificable

- Un `.pptx` real se acepta con propósito `slides` y se rechaza con propósito `image`.
- Un `.csv` se acepta con propósito `dataset`.
- Un `.html` renombrado a `.csv` se rechaza (extensión fuera de la lista).
- Un ejecutable ELF renombrado a `.pdf` se sigue rechazando.
- Un `.svg` se sigue rechazando en todos los propósitos.
- Un binario sin firma reconocida y sin extensión permitida se rechaza.

---

## Paso 3 — Work types y audit log — HECHO

`pnpm verify` en verde con 216 tests. Los 17 recursos administrativos del ERS §31
están ahora implementados.


### Work types

`ERS.md` §31 lista `/work-types` y RF-003 exige poder añadir tipos sin tocar la
estructura de `works`. Hoy el catálogo solo se siembra.

- `GET`, `POST`, `PATCH /api/admin/work-types`, más `POST /:id/deactivate`.
- El `code` es **inmutable** una vez creado: es la clave que usan el filtro público
  `?type=` y el mapeo a tipo de entrada BibTeX. Cambiarlo rompería enlaces existentes.
  Se editan `label`, `pluralLabel`, `sortOrder` e `isActive`.
- Borrado solo si ningún work lo usa; si no, 409 y desactivar.

### Audit log

`ERS.md` §31 lista `/audit-log` y §27 define la tabla. Hoy se escribe y nunca se lee.

- `GET /api/admin/audit-log` con paginación y filtros por `entityType`, `entityId`,
  `userId` y rango de fechas.
- Solo lectura: una auditoría que se puede editar no es una auditoría.
- Devuelve `oldData`/`newData` tal cual. Son instantáneas que ya pasaron por
  `JSON.parse(JSON.stringify(...))` al escribirse y la ruta es admin-only.

---

## Paso 4 — Campos sueltos — HECHO

`persons.phone` y `works.firstOnlineDate` expuestos; `media_assets.public_url`
eliminada por migración.


- `persons.phone` existe en la tabla (ERS §8) pero no llega a `PeopleRepository` ni a
  los esquemas: no se puede editar. Añadirlo al puerto, al repositorio y al esquema
  admin. **No** se expone en el presenter público: el ERS lo marca "normalmente no
  visible".
- `works.firstOnlineDate` se acepta al escribir pero no vuelve en `WorkRecord`.
  Añadirlo al registro y al detalle público.
- `media_assets.publicUrl` está en la tabla y nunca se rellena. Decidir: o se elimina
  del esquema en una migración, o se rellena al subir un archivo público. Recomendación:
  **eliminarla**. Las URLs se construyen en el presenter a partir del id, que es lo que
  ya hacen todos los endpoints; una columna con la misma información se desincroniza en
  cuanto cambie `PUBLIC_BASE_URL`.

---

## Orden y esfuerzo

| Paso | Bloquea | Esfuerzo |
|---|---|---|
| 1 — Tags | Sí: RF-007 y el criterio "puede añadir tags" del ERS §58 | ~45 min |
| 2 — Formatos | Sí en la práctica: el académico no puede subir su material | ~1 h |
| 3 — Work types y audit log | No | ~40 min |
| 4 — Campos sueltos | No | ~20 min |

Cada paso termina con `corepack pnpm verify` en verde y sus tests.

---

## Lo que este plan NO cubre

- **Fusionar tags duplicados.** Útil para limpiar, pero el ERS no lo pide y el 409 con
  el id existente ya evita crearlos.
- **Formatos Office heredados** (`.doc`, `.xls`, `.ppt`), por lo explicado arriba.
- **Antivirus en las subidas.** SEC-005 lo menciona como "si la infraestructura lo
  permite". Con más formatos aceptados gana peso; queda anotado en
  `docs/plans/technical-debt.md`.
- **La validación contra PostgreSQL**, que sigue pendiente para todo el backend y es
  independiente de estos huecos.
