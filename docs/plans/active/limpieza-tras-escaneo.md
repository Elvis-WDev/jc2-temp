# Limpieza tras el escaneo de la plataforma

## Goal

Cerrar lo que salió del escaneo completo del 19 de agosto de 2026. **Nada de esto es un
fallo que vea un visitante ni el titular del sitio**: son incoherencias internas, una
carrera improbable y peso muerto. El escaneo —más de 110 comprobaciones sobre el sistema
en marcha— no encontró ningún bug de comportamiento, así que esto es higiene, no rescate.

Por eso el orden es de menor a mayor riesgo, y **las fases 3 y 4 se pueden abandonar sin
consecuencias** si aparece trabajo de verdad.

## Decisions

- **Se arregla la causa, no el síntoma.** En la fase 1 el problema no es que sobre una
  clave en un JSON, sino que hay dos caminos que leen las secciones y solo uno respeta la
  regla de `PageRules`.
- **La carrera del slug se resuelve reintentando, no bloqueando.** Un `SELECT ... FOR
  UPDATE` o un bloqueo de tabla costaría más de lo que vale: quien escribe es una sola
  persona. Reintentar sobre el error de la restricción única es la solución barata y
  correcta.
- **La fase 3 empieza por una auditoría, no por el cambio.** Volver estrictos los esquemas
  de escritura puede romper el panel si en algún sitio manda un campo de más. Primero se
  mira qué manda; si manda algo de más, se corrige el panel antes de tocar el esquema.
- **El peso muerto se borra, no se comenta.** Lo que hoy no usa nadie está en el
  historial de git si alguna vez hace falta.

## Tasks

### Fase 0 — Entorno para verificar

La base remota está caída, así que las fases siguientes necesitan dónde ejecutarse.

- [x] Levantar el PostgreSQL local: `docker compose -f api/docker-compose.dev.yml up -d`.
- [x] Migrar y sembrar contra él con `.env.dev`, copia de `.env` en la que **solo** cambia
      `DATABASE_URL` a `postgresql://jc2:jc2@localhost:5432/jc2`.
- [x] `.env.scan` borrado, para que nadie lo herede sin darse cuenta: tenía los límites de
      peticiones a 100.000 y no representaba la configuración real.

**Hecho el 19 de agosto de 2026.** Cómo se usa:

```bash
docker compose -f api/docker-compose.dev.yml up -d          # la base
cd api && npx tsx --env-file=../.env.dev src/main/server.ts # la API en :4000
cd web && corepack pnpm dev                                 # el sitio y el panel en :3000
```

El archivo se llama `.env.dev` y no `.env.local` a propósito: Vite carga `.env.local` por
su cuenta y con prioridad sobre `.env`, y eso convertiría un archivo de trabajo en una
configuración fantasma difícil de rastrear.

Comprobado de punta a punta: las 17 migraciones aplicadas, el sembrado idempotente
(«already-exists», «skipped»), 17 trabajos publicados servidos por la API, las cuatro
páginas públicas a 200 y la sesión del panel abriendo la tabla de trabajos con 19 filas,
sin un solo error de consola.

Las sondas del escaneo que verifican las fases siguientes están en `/tmp/jc2-scan/`. No
sobreviven a un reinicio: si hacen falta más allá de esta sesión, hay que moverlas a
`api/scripts/`.

### Fase 1 — Una sola verdad sobre las secciones

**Qué pasa.** `GET /api/public/site` sigue anunciando `"research.filters": true`, una
sección que el código ya no dibuja. `SiteContentUseCases.listSections()` filtra por
`PageRules.SECCIONES`, pero `getVisibility()` llama a `this.repo.listSections(null)` por
su cuenta y se salta el filtro.

**Impacto.** Ninguno hoy: nadie lee esa clave. Mañana sí, si alguien la toma por buena.

- [x] En `getVisibility()`, leer con `this.listSections(null)` en lugar de bajar al
      repositorio, para que el filtro valga en los dos caminos.
- [x] Comprobar que `esVisible()` sigue resolviendo igual con la lista ya filtrada: recibe
      la misma lista que se recorre, y para una clave conocida el resultado no cambia.
- [x] Prueba en `SiteContentUseCases.test.ts`: una fila con clave desconocida no aparece
      en `sections` ni en `backgrounds` ni en `headings`.
- [x] Repasar si `teaching.filters` debe seguir existiendo: Teaching **sí** conserva su
      barra, así que se queda.

Riesgo: mínimo. Un archivo, una línea y una prueba.

**Hecha el 19 de agosto de 2026.** `GET /api/public/site` ya no anuncia
`research.filters`, y sigue anunciando `research.header` y `teaching.filters`. La prueba
se comprobó al revés: con el código anterior falla («expected [ 'research.header', …(1) ]
to deeply equal [ 'research.header' ]»), así que protege de verdad. `corepack pnpm verify`
en verde con 280 pruebas, y el sitio recorrido entero sin un solo error: Teaching mantiene
su barra y Research sigue sin filtros y agrupado por tipo.

### Fase 2 — La carrera al generar el slug

**Qué pasa.** `WorkUseCases.slugLibre()` pregunta si un slug existe y luego inserta. Entre
las dos cosas cabe otra petición. Con 12 altas simultáneas del mismo título, 2 pasan y 10
mueren con **409**, en vez de recibir `-2`, `-3`…

**Impacto.** Muy bajo: hace falta que dos altas con idéntico título coincidan en el mismo
instante, y el sitio lo lleva una sola persona. La integridad nunca corre peligro, porque
la restricción única de la base es la que corta.

- [x] Envolver la escritura en un reintento: si la base rechaza por slug duplicado, se
      prueba el siguiente sufijo, hasta `MAX_INTENTOS_SLUG`.
- [x] Los tres —`WorkUseCases`, `CourseUseCases` y `EventUseCases`— tenían copiado el
      mismo `slugLibre`. El reintento se extrajo a `escribirConSlugLibre`, en
      `domain/research/Slug.ts`, que ya era el sitio común de los tres.
- [x] Prueba unitaria del ayudante: falla la primera escritura con el error de unicidad y
      acepta la segunda; debe devolver lo creado y haber probado `mi-titulo` y luego
      `mi-titulo-2`.
- [x] Prueba de integración: `api/scripts/sonda-concurrencia.mjs`, 12 altas en paralelo.

Riesgo: contenido. Solo toca la creación, y el peor caso sigue siendo el 409 de hoy.

**Hecha el 19 de agosto de 2026.** La sonda contra el sistema real pasó de **2 creadas y
10 conflictos** a **12 creadas con 12 slugs distintos, cero conflictos**. La prueba
unitaria se comprobó al revés: sin el `catch` del reintento falla con «Unique constraint
failed».

Decisiones al extraer:

- **La política de agotamiento la decide quien llama**, con un `agotado()`: un trabajo o un
  curso prefieren un sufijo con marca de tiempo antes que fallar, y un evento prefiere
  fallar con `EVENT_SLUG_EXHAUSTED`. Unificarla habría cambiado comportamiento a espaldas
  de nadie.
- **Solo se reintenta el choque de slug.** Un DOI repetido no se arregla cambiando el
  slug, así que sube tal cual; hay prueba de eso.
- **El predicado vive en `shared/errors/uniqueViolation.ts`** y mira la forma del error en
  vez de importar Prisma, porque lo usan el dominio y la aplicación, que no conocen la
  infraestructura.
- Sin cambio de slug, `update` escribe directo: no hay nada que disputar.

### Fase 3 — Campos desconocidos en el `PATCH`

**Qué pasa.** `PATCH /api/admin/works/:id` con `isFeatured: true` responde **200 sin
guardar nada**: Zod elimina las claves que no están en el esquema. Quien llame a la API
por su cuenta creerá que funcionó.

**Impacto.** Ninguno en el panel, que nunca manda ese campo —para destacar usa
`POST /works/:id/featured`, que sí aplica RN-003—. Afecta a quien integre contra la API.

- [x] **Auditar primero**, y midiendo en vez de leyendo: se instrumentó `validate()` para
      registrar cada clave que Zod descartaba, y se recorrió el panel guardando el
      formulario de edición de cada entidad. **16 peticiones de escritura reales, cero
      campos descartados.** El instrumento se comprobó antes de fiarse del cero: un
      `PATCH` con campos inventados sí quedó registrado.
- [x] Nada que corregir: los formularios arman el cuerpo campo a campo. Los cuatro
      sospechosos del `grep` (`{ ...payload }` en works, courses y events, y `values` en
      academic-statuses) resultaron ser objetos literales explícitos.
- [x] La regla se aplicó **en `validate()`, no esquema a esquema**. Ver decisiones abajo.
- [x] Barrido con la regla activa: los 19 formularios de edición, altas, subida multipart,
      interruptores de sección y acciones de fila. **Cero rechazos.**

Riesgo: **el más alto de la lista**, porque toca el contrato de toda la API de escritura.
Si la auditoría saca más de dos o tres sitios, mejor dejarlo documentado y no cambiarlo.

**Hecha el 19 de agosto de 2026.** `PATCH /api/admin/works/:id` con `isFeatured` ya no
responde 200 en falso: devuelve 422 `UNKNOWN_FIELDS` diciendo qué campo sobra. Un campo
mal escrito (`titel`) también. Lo legítimo sigue en 200, y `POST /works/:id/featured`
—la ruta que sí destaca— también.

Decisiones:

- **La regla vive en `validate()` y no en 26 `.strict()`.** Son 42 rutas con cuerpo, y una
  nueva heredaría el silencio con solo olvidarse de añadirlo. Un sitio, y ninguna ruta
  futura se queda fuera.
- **Solo el cuerpo; las consultas siguen tolerando lo desconocido.** Una dirección puede
  traer parámetros de terceros —campañas, rastreadores— y rechazarlos rompería enlaces que
  ya circulan.
- **Solo el primer nivel.** Es donde está el caso real, y evita falsos positivos: las
  transformaciones que hay en los cuerpos son de campo (una fecha que pasa a `Date`) y no
  alteran las claves. Se comprobó que ninguna transformación de objeto vive en un cuerpo.

### Fase 4 — Peso muerto

**Qué pasa.** `knip` señala 28 archivos y 4 dependencias que no usa nadie, casi todo
herencia de la plantilla shadcn-admin.

- [x] Borrados los 28 archivos sin uso, comprobando uno a uno que nadie los importa. Los
      16 iconos de marca resultaron ser una isla: solo los importaba su propio barril, que
      tampoco usaba nadie.
- [x] Quitadas `recharts`, `input-otp`, `@radix-ui/react-tabs` y `@faker-js/faker`. Las
      dos del medio las importaban `ui/input-otp.tsx` y `ui/tabs.tsx`, que `knip` ignora
      por configuración; se borraron también, tras comprobar que no se usan fuera de
      `ui/`. **Quitar solo la dependencia habría roto el build.**
- [x] Retiradas además las 10 exportaciones muertas: `bulk-actions.tsx` entero, tres
      reexportaciones del barril de `data-table` —`DataTablePagination` y
      `DataTableToolbar` se quedan como archivos, porque se importan directamente—,
      `useFont`, `getTag`, `getVenue`, `mensajeDeApiError`, `sleep` y
      `getDisplayNameInitials`, con las importaciones y la directiva de eslint que
      quedaron huérfanas.
- [x] Medido antes y después.
- [x] `knip` sin ningún aviso.

Riesgo: bajo pero no nulo. `recharts` pesa mucho y por eso compensa, pero conviene
borrar en un commit aparte para poder revertirlo solo.

**Hecha el 19 de agosto de 2026.** Lo que se ganó, con los números delante:

| | Antes | Después |
| --- | --- | --- |
| `dist/assets` | 1.889.365 B | 1.883.088 B (−6 KB) |
| `node_modules` | 869 MB | 830 MB (**−39 MB**) |
| Archivos de `src/` | — | 30 menos |

**El bundle apenas se movió, y era de esperar**: el código muerto no lo importaba nadie,
así que nunca entraba en el bundle; ya lo descartaba el empaquetador. Lo que se gana de
verdad es peso de instalación y cuatro dependencias menos que auditar y actualizar.

Los 45 tipos exportados que `knip` marcaba **no se tocaron**: son los contratos de entrada
de cada función del cliente, usados dentro de su propio archivo. Quitarles el `export`
dejaría funciones públicas con parámetros que no se pueden nombrar desde fuera. Se declaró
`ignoreExportsUsedInFile` en `knip.config.ts` para que deje de avisar de ellos y siga
avisando de las funciones muertas. De paso se retiró una exclusión obsoleta:
`app-title.tsx` sí se usa.

Comprobado: `corepack pnpm verify` en verde con 200 pruebas, y las 24 pantallas del panel
y del sitio recorridas sin un solo error de consola.

### Fase 5 — Higiene pendiente

- [x] `web/index.html` formateado. El único cambio fue partir una línea larga; el
      contenido quedó intacto. **`pnpm format:check` está limpio en los dos paquetes por
      primera vez.**
- [x] El aviso de las migraciones ya no vive solo dentro de migraciones antiguas, donde no
      lo lee quien va a generar la siguiente. Ahora hay un documento propio,
      [migraciones.md](../../architecture/migraciones.md), enlazado desde los dos sitios
      donde uno se planta antes de romperlo: la cabecera de `schema.prisma` y las reglas
      de migración de `database.md`.

**Hecha el 19 de agosto de 2026.** El aviso se comprobó, no se dio por bueno: se generó
una migración de prueba contra una base desechable y Prisma **sigue proponiendo hoy** el
borrado de los cuatro objetos documentados y de los `DEFAULT` de seis columnas
`updated_at`. La migración de prueba y la base desechable se borraron después.

El documento recoge además una lección del incidente que no estaba escrita en ningún
sitio: **una migración no se aplica dentro de una única transacción**, así que un fallo a
mitad deja cosas hechas. Por eso lleva un procedimiento de recuperación paso a paso.

## Verification

Por fase, y al final del todo:

- `corepack pnpm verify` en `api/` y en `web/`.
- Las sondas del escaneo contra el sistema en marcha: reglas de negocio, frontera de
  archivos, paginación completa y barrido de las 24 pantallas sin errores de consola.
- Para la fase 1, además: `GET /api/public/site` ya no menciona `research.filters`.
- Para la fase 2: las 12 altas simultáneas terminan en 12 trabajos.
- Para la fase 4: el sitio y el panel siguen compilando y el bundle baja de tamaño.


---

## Añadido el 19 de agosto de 2026: `cn()` se comía los tamaños de letra

Salió revisando la alineación de los rótulos de Research, no del escaneo.

`cn()` pasa las clases por `tailwind-merge`, que decide qué clases chocan por su prefijo.
`text-site-display-sm` (un tamaño) y `text-site-on-surface` (un color) empiezan igual, así
que las tomaba por el mismo grupo y **se quedaba solo con la última: el tamaño
desaparecía**. En escritorio no se notaba porque la variante `md:` va en otro grupo y
sobrevivía; en móvil el título de cada página caía a los 16 px por defecto del navegador.

Medido antes y después, a 390 px de ancho:

| Página | Antes | Después |
| --- | --- | --- |
| Portada, Research, Teaching, Events | 16 px | **32 px** |

Arreglado en `cn()` con `extendTailwindMerge`, declarando los ocho tamaños del sitio como
lo que son. Es un solo sitio y vale para las 17 pantallas que usan `cn()`. Hay pruebas en
`src/lib/utils.test.ts` que fijan las dos mitades: que el tamaño y el color conviven, y
que dos tamaños entre sí sí se pisan.
