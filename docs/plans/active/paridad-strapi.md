# Qué falta respecto al sistema anterior

Comparación campo a campo del modelo de contenidos de Strapi con el esquema actual
(24 tablas). Hecha el 11 ago 2026 a partir del listado de 14 tipos que aportó el titular.

Tres categorías: lo que ya está cubierto, lo que se modela distinto a propósito, y lo
que de verdad falta.

## 1. Ya cubierto, igual o con más detalle

| Antes | Ahora | Nota |
| --- | --- | --- |
| Keyword | `Tag` | Además con identificador estable, categoría y reutilizable en cursos. La deduplicación por mayúsculas/acentos (RF-007) no existía antes. |
| Publication | `Work` | 44 campos frente a 15. Añade subtítulo, estado editorial separado del académico, ISBN/ISSN, número de artículo, fecha de primera publicación en línea, cita manual y BibTeX propio. |
| Publication Type | `WorkType` | Falta `max_items_home` (ver §3). |
| Person + Social Network | `Person` + `PersonLink` | 32 campos frente a 8: ORCID, Scholar, Scopus, SSRN, RePEc, CV, biografía corta y extendida, declaración de investigación. |
| Course | `Course` | Añade título corto, código, nivel, estado editorial y destacado. |
| Course Instance | `CourseOffering` | Los `documents` sueltos pasan a `CourseMaterial`, con título, tipo, descripción y visibilidad propia por material, y archivo **o** enlace externo. |
| Institution / Department | igual | Añaden identificador estable, siglas, ciudad, país y poder ocultarlas sin borrarlas. |
| Subir varios archivos donde haga falta | `WorkFile`, `CourseMaterial` | Sin límite de número. Cada archivo lleva su tipo, etiqueta, versión, orden y visibilidad. Además se validan por contenido real, no por extensión. |

## 2. Modelado distinto a propósito

**Dónde cuelga un curso.** Antes: `Course → Department` (un curso pertenecía a un
departamento). Ahora: la institución y el departamento van en cada **edición**, no en el
curso. Así la misma asignatura impartida en dos universidades es un curso con dos
ediciones, y no dos cursos duplicados. Es un superconjunto: lo de antes se sigue
pudiendo expresar.

**El crédito de una imagen.** Antes había `cite_cover_image` en Course y `image_cite` en
Event. Ahora el crédito vive en el archivo (`MediaAsset.credit`), así que se escribe una
vez y vale para todos los sitios donde se use esa imagen.

**`has_instance`.** Era una casilla que había que mantener a mano. Ahora se deduce de si
el curso tiene ediciones.

## 3. Lo que falta de verdad

### Bloqueantes: cosas que antes podías hacer y ahora no

**A. Eventos — el módulo entero no existe.**
Nada equivalente. Faltaría: título, tipo, contenido, fecha de inicio y fin, lugar,
organizador, imagen, enlace de botón, color del botón, destacado, e instituciones
relacionadas (varias). Es el hueco más grande.

**B. Revistas (Issue) — no hay entidad reutilizable.**
Ahora el nombre de la revista, el volumen y el ISSN son texto suelto **repetido en cada
trabajo**. Antes era una ficha propia con: abreviatura, año, páginas, número, tipo,
editorial, ISSN, prefijo ISBN, país, web, **CiteScore** y **ranking**. Para un economista
el ranking y el CiteScore de la revista no son un adorno: es como se lee un CV.
Sin esto no se puede ordenar ni filtrar por calidad de la revista, y cada trabajo
reescribe los mismos datos con el riesgo de escribirlos distinto.

**C. Estados de publicación — son una lista cerrada.**
`AcademicStatus` es un enum en la base de datos con ocho valores fijos. Antes `Status`
era una tabla y podías añadir el que necesitaras. Esto es literalmente lo que se pedía
con "me permitía crear cada tipo".

**D. Estilos de cita — solo hay BibTeX.**
Antes: `Citation Style` (nombre + extensión) y una `Citation` por publicación **y estilo**,
con su texto. Ahora se genera BibTeX y hay un único texto de cita manual por trabajo.
No se puede tener la misma publicación en APA, Chicago y RIS a la vez.

**E. Quién imparte cada edición.**
Antes `Course Instance ↔ Person` (varios). Ahora solo hay `teachingRole`, un texto libre.
No se puede decir que una edición la impartieron tres personas concretas, ni enlazar sus
fichas.

### Menores

| Falta | Dónde | Comentario |
| --- | --- | --- |
| `color` | Institution, Event | Color de marca para distinguirlas en la web. |
| `order` | Institution, Department | Ni una ni otro tienen orden manual; los trabajos y cursos sí. |
| `description` | Department | El departamento no tiene descripción. |
| `link` | Course | Enlace externo a la ficha oficial del curso. |
| `max_items_home` | Publication Type | Cuántos de cada tipo salen en la portada. |
| `version` | Publication | Existe por archivo (`versionLabel`), no a nivel de trabajo. |
| `images` (galería) | Publication | Se puede hacer con archivos de tipo imagen, pero no hay una galería como tal. |
| icono propio | Social Network | Ahora se elige un icono de una lista, no se sube una imagen. |
| `download_code` | Publication | **No sé qué hacía.** Hace falta que lo expliques antes de decidir si se replica. |

## 4. Propuesta

Cinco pasos, del que más desbloquea al que menos. Los menores se reparten por el camino
porque cada uno cae dentro del módulo que ya se está tocando.

1. **Estados creables** (C). Pasar `academic_status` de enum a tabla, con los ocho
   actuales sembrados. Migración con conversión de datos. Desbloquea "crear cada tipo".
2. **Revistas** (B). Entidad nueva con sus metadatos, relación desde el trabajo, y
   migración que cree una revista por cada `venue_name` distinto que ya exista para no
   perder lo escrito. Pantalla propia con su CRUD.
3. **Eventos** (A). Módulo nuevo completo: tabla, API, pantalla, y su sitio en la web
   pública.
4. **Quién imparte** (E) + los menores de docencia: `link` en curso, `description` y
   `order` en departamento, `color` y `order` en institución.
5. **Estilos de cita** (D) + `max_items_home`, galería de imágenes y `version`.

Los pasos 1 y 2 llevan migración con conversión de datos existentes. Los tres primeros
son los que de verdad cambian lo que puedes hacer.
