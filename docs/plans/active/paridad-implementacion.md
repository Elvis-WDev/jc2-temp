# Plan: paridad con el sistema anterior

Cierra lo que falta según `paridad-strapi.md`, y añade lo que se pidió por encima de
aquello: **poder crear cada tipo, cada etiqueta y cada categoría** en lugar de depender de
listas fijas escritas en el código.

Seis fases. Cada una es utilizable por sí sola y se verifica contra la base de datos real
antes de pasar a la siguiente.

## La regla que no se toca

`editorial_status` (borrador / publicado / archivado) **sigue siendo un conjunto cerrado**.
Es la única puerta de la visibilidad pública (RN-001) y de ella dependen RN-002 y RN-003.
Convertirlo en algo editable dejaría que alguien inventara un cuarto estado que la web no
sabría interpretar.

`academic_status` es otra cosa: es cómo describe el autor la madurez de su trabajo. Ahí no
cuelga ninguna regla —comprobado: ni una sola condición del dominio lo mira— así que sí
puede ser una lista que el titular amplíe.

Esa distinción es la que hace que el resto del plan sea seguro.

## Fase 1 — Que todo tipo se pueda crear

Hoy hay vocabularios que se guardan como texto libre (tipo de enlace, tipo de archivo,
tipo de material, tipo de vínculo de una afiliación) pero cuyas opciones están escritas a
mano en el código del panel. Se pueden ampliar, pero no desde la aplicación.

**Tabla nueva `catalog_terms`**: `catalog`, `code`, `label`, `sortOrder`, `isActive`, con
único `(catalog, code)`. Los catálogos iniciales son los que ya existen: enlaces de
trabajo, enlaces de persona, archivos de trabajo, materiales de curso, vínculos de
afiliación. Más adelante se le suman los de evento y revista.

**Las columnas siguen siendo texto, sin clave foránea.** Es deliberado, y está escrito
así en el esquema desde el principio: un valor importado que todavía no tenga término se
sigue guardando y se muestra tal cual, en vez de rechazarse. La tabla aporta las opciones
del desplegable y su orden, no una restricción.

- Pantalla **Catálogos**: eliges el catálogo y gestionas sus términos con el mismo CRUD
  que el resto (alta, edición, orden, ocultar y mostrar).
- Los desplegables del panel dejan de leer constantes y leen la API.
- Siembra con las listas actuales, para que nada cambie de aspecto el primer día.

Sin migración de datos. Nada puede romperse porque no se añade ninguna restricción.

## Fase 2 — Estado académico creable

`academic_status` pasa de enum a tabla `academic_statuses` (`code`, `label`, `sortOrder`,
`isActive`) y `works.academic_status` pasa a ser una clave foránea.

- Migración en tres pasos dentro de una transacción: crear la tabla y sembrar los ocho
  valores actuales con su etiqueta; añadir la columna nueva y rellenarla emparejando por
  código; quitar la vieja. **Ningún trabajo cambia de estado.**
- Las facetas de la web pública dejan de agrupar por el enum y agrupan por la relación,
  devolviendo la etiqueta y no el código.
- No se puede borrar un estado en uso: 409, como con los tipos de trabajo. Ocultarlo sí.
- Pantalla propia, igual que Tipos de trabajo.

Riesgo controlado: los puertos de la aplicación ya tipan este campo como texto, así que el
cambio no sube de la capa de infraestructura.

## Fase 3 — Revistas

Tabla nueva `venues`: nombre, abreviatura, tipo (del catálogo), editorial, ISSN, prefijo
ISBN, país, web, **ranking** y **CiteScore**.

El volumen, el número, las páginas y el año **se quedan en el trabajo**, que es donde
cambian de un artículo a otro. En el sistema anterior estaban mezclados en la misma ficha,
lo que obligaba a crear una entrada por cada volumen.

- `works.venue_id` como clave foránea que admite vacío. `venue_name` se conserva para los
  trabajos cuya publicación no merece ficha propia (un working paper, una nota interna).
  La API devuelve el nombre resuelto: el de la ficha si la hay, y si no el texto suelto.
- Migración: se crea una revista por cada `venue_name` distinto que ya exista y se apunta
  cada trabajo a la suya. No se pierde nada de lo escrito.
- El índice de búsqueda (`search_vector`) se amplía para incluir el nombre de la revista,
  con el mismo disparador que ya cubre autores y etiquetas.
- Pantalla propia con su CRUD y buscador.

## Fase 4 — Eventos

Módulo nuevo completo. Tabla `events`: título, identificador, tipo (del catálogo),
contenido en Markdown, inicio y fin, lugar, organizador, imagen, texto y enlace del botón,
color del botón, destacado, estado editorial, y relación con varias instituciones.

- Estado editorial como el resto: borrador, publicado, archivado. La web solo ve los
  publicados.
- API de administración y endpoint público con su listado y su ficha.
- Pantalla con tabla, filtros por tipo y por estado, y formulario en página —lleva
  contenido largo e instituciones relacionadas—.

## Fase 5 — Docencia: quién imparte y los campos que faltan

- **`course_offering_teachers`**: personas concretas que impartieron cada edición, con su
  papel y su orden. Sustituye al texto libre `teaching_role`, que se conserva para lo ya
  escrito.
- `courses.external_url`: enlace a la ficha oficial del curso.
- `departments.description_markdown` y `departments.sort_order`.
- `institutions.brand_color` y `institutions.sort_order`.

Las dos pantallas afectadas ya existen; solo crecen.

## Fase 6 — Citas y lo que queda

- **`citation_styles`** (nombre, código, extensión) y **`work_citations`** (trabajo,
  estilo, contenido), con único por pareja. El BibTeX que ya se genera se mantiene como
  estilo por defecto cuando no hay una cita escrita a mano.
- `work_types.max_items_home`: cuántos de cada tipo salen en la portada.
- `works.version_label` y `works.download_code`. El código de descarga es informativo: se
  muestra junto al enlace externo para quien lo necesite en el sitio de destino, y **no
  restringe nada aquí**.
- Galería de imágenes de un trabajo: se resuelve con los archivos que ya existen, usando un
  término de catálogo para las figuras y mostrándolas juntas en la ficha.
- `person_links.icon_media_id`: icono propio subido, además de los de la lista.

## Cómo se verifica cada fase

El mismo método que ha encontrado todos los fallos hasta ahora: un script que hace
peticiones reales contra la base de datos, no solo pruebas con dobles.

En las fases con migración (2 y 3) se comprueba además, **antes y después**, que el número
de filas y los valores no cambian: ningún trabajo cambia de estado ni pierde el nombre de
su publicación.

## Si tienes el volcado del sistema anterior

Cambia el plan de siembra. En lugar de sembrar los valores por defecto y que rellenes a
mano, importaríamos tus términos, tus revistas con su ranking y tus eventos. Dilo antes de
la fase 1: es la diferencia entre empezar con tu contenido o empezar en blanco.

---

## Resultado (11 ago 2026)

Las seis fases están hechas y verificadas. `pnpm verify` en verde en los dos proyectos:
**250 pruebas** en el backend, **120** en el panel. **199 comprobaciones** contra la base
de datos real repartidas entre las seis fases, todas en verde en la pasada final.

Cinco migraciones aplicadas, cada una con copia de la base de datos antes. Las dos que
convertían datos —estado académico y revistas— llevaban una comprobación dentro que
abortaba la transacción entera si alguna fila se quedaba sin convertir; no hizo falta.

### Lo que ya se puede hacer y antes no

| | |
| --- | --- |
| Crear cada tipo | Siete catálogos editables: enlaces de trabajo, de persona, archivos, materiales, vínculos, publicaciones y eventos |
| Crear estados | El estado académico dejó de ser una lista cerrada de ocho, con su color |
| Revistas | Ficha propia con ISSN, país, abreviatura, **ranking** y **CiteScore** |
| Eventos | Módulo completo, con su parte pública |
| Quién imparte | Personas concretas por edición, con su papel |
| Citas por estilo | APA, Chicago, MLA, Harvard, BibTeX, RIS, y los que se añadan |

Más: color y orden en instituciones, descripción y orden en departamentos, enlace oficial
en cursos, cuántos salen en la portada por tipo, versión y código de descarga del trabajo,
galería de figuras e icono propio en los enlaces personales.

### Lo que sigue sin replicarse, y por qué

- **`image_cite`**: el crédito de una imagen vive en el archivo, así se escribe una vez y
  vale donde se use.
- **`has_instance`**: se deduce de si el curso tiene ediciones, en vez de mantenerse a mano.
- **`Course → Department`**: la institución y el departamento van en cada edición, lo que
  permite la misma asignatura en dos universidades sin duplicar el curso.

### Pendiente

- ~~Las páginas públicas (Home, Research, Teaching) y el prerenderizado para el SEO.~~
  Hechas el 11 ago 2026, más Eventos: ver `sitio-publico.md`. El renderizado en servidor
  queda decidido y documentado en ADR-0005.
- ~~La portada compuesta incluye el texto de `home` aunque esté oculta.~~ Corregido el 11
  ago 2026, fase 3 de `sitio-publico.md`.
- El nombre de un archivo subido sigue sin poder cambiarse.
- No hay repositorio git: ocho migraciones aplicadas sin punto de retorno para el código.
