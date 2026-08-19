# Plan: la web principal

Convierte las tres plantillas de `plantillas-webprincipal/` (Home, Research, Teaching) en
el sitio público real, servido desde la misma aplicación que el panel, alimentado por la
API pública que ya existe, **y con la raíz `/` apuntando al sitio, no al panel**.

Ocho fases. Cada una deja algo utilizable y se verifica contra la base de datos y el
navegador reales antes de pasar a la siguiente.

---

## Lo primero: dónde están las plantillas

La carpeta **no está en este proyecto**. Vive en el proyecto viejo:

```
/media/elvis/disco2/Outliers-solutions/jc2-v2/plantillas-webprincipal/
   home.html  research.html  teaching.html
```

La copio a `docs/design/plantillas-webprincipal/` para que la referencia viaje con el
repositorio y no dependa de un disco externo. Las plantillas son HTML estático con
Tailwind por CDN y datos inventados: **no se integran, se traducen**. De ellas salen dos
cosas —el sistema de diseño y la estructura de secciones— y nada más; las imágenes que
traen son enlaces temporales de Google que caducarán, y se sustituyen todas.

---

## Lo que no se toca

Tres cosas que el sitio público **no puede** cambiar, porque son lo que impide que se
escape contenido:

1. **RN-001.** `editorial_status = 'published'` va incrustado en cada consulta de los
   repositorios públicos. El sitio no filtra: pide, y lo que llega ya está filtrado.
2. **Los presenters públicos.** Son listas blancas explícitas: nunca sale
   `editorialStatus`, ni `createdBy`, ni un identificador de almacenamiento. Si una
   pantalla necesita un campo nuevo, se añade al presenter a mano, uno a uno.
3. **El guardián del panel.** `beforeLoad` sobre el layout administrativo. Al mover el
   panel a `/admin` el guardián se mueve con él: cualquier ruta que se añada debajo sigue
   naciendo protegida sin que nadie tenga que acordarse.

Y una decisión de la misma familia: **el sitio público no enlaza al panel**. Ni un botón,
ni un pie, ni el avatar de la cabecera de la plantilla. Quien administra escribe `/admin`.

---

## El diseño, en datos

De los tres archivos sale un sistema coherente. Es deliberadamente distinto del panel:
esquinas casi rectas (2px frente a 10px), tipografía con serifa para los títulos, y una
paleta azul muy oscura con acentos terracota.

**Color** — 22 tonos en uso, de los que mandan seis:

| | |
| --- | --- |
| `primary` `#020d24` | Títulos, botones sólidos, la sección oscura |
| `primary-container` `#18233b` | Cabecera y pie |
| `background` / `surface` `#f7fafd` | Fondo general |
| `surface-container-lowest` `#ffffff` | Tarjetas |
| `on-surface-variant` `#45464d` | Texto secundario |
| `on-tertiary-container` `#c37754` | El único acento cálido: enlaces al pasar, subrayado del menú activo |

**Tipografía** — Playfair Display para lo grande, Inter para el resto:

```
display-lg      48/56  -0.02em  700     headline-md   32/40  600
display-lg-mob  32/40           700     headline-sm   24/32  600
body-lg         18/28           400     body-md       16/24  400
label-caps      12/16   0.05em  600     mono-metadata 13/18  500
```

**Medidas**: contenedor 1120px, canalón 24px, margen móvil 16px, aire de sección 80px.

**Motivo Moche**: un friso en zigzag, ya incrustado como SVG en el propio HTML. Se queda
como una utilidad CSS, sin archivo externo ni petición de red.

**Iconos**: la plantilla usa Material Symbols. Se sustituyen por `lucide-react`, que ya es
una dependencia del proyecto —una fuente de iconos menos que descargar—.

---

## Lo que la API ya sirve, y lo que no

Ya está y encaja:

| Endpoint | Alimenta |
| --- | --- |
| `GET /api/public/home` | Perfil, textos de la portada, destacados, ajustes |
| `GET /api/public/research` | Listado con paginación y facetas (tipos, estados, años, etiquetas) |
| `GET /api/public/research/:idOrSlug` | Ficha: resumen, autores, archivos, figuras, enlaces, cita, BibTeX |
| `GET /api/public/teaching` | Cursos con facetas (institución, departamento, etiquetas) |
| `GET /api/public/teaching/:idOrSlug` | Curso con ediciones, docentes y materiales |
| `GET /api/public/events` y `/:idOrSlug` | Eventos publicados |
| `GET /api/public/profile`, `/pages/:pageKey` | Perfil y textos por página |
| `GET /api/public/media/:id` | Archivos, solo si son públicos **y** cuelgan de algo publicado |

Faltan cinco cosas. Las he comprobado, no supuesto:

1. **Un fallo que rompe todas las imágenes.** La API responde
   `Cross-Origin-Resource-Policy: same-origin` (cabecera por defecto de helmet).
   Comprobado con `curl` contra `/api/public/media/…`: **el navegador se negará a pintar
   la foto del perfil, las portadas y las figuras** en una página servida desde otro
   origen. Hoy no se nota porque nadie mira esas imágenes desde fuera del panel. Fase 1.
2. **Research y Teaching no reciben los ajustes del sitio.** `siteName`, el pie, los
   interruptores `showResearchFilters` / `showTeachingFilters` y los valores por defecto
   de SEO solo salen dentro de `/api/public/home`. Una cabecera y un pie iguales en todas
   las páginas no pueden depender del endpoint de la portada. Fase 3.
3. **La tarjeta de Research se queda corta.** El resumen no trae `volume`, `issue` ni la
   dirección del PDF —solo un `hasPdf` booleano—, y la plantilla los muestra los tres.
4. **No hay logotipo.** `site_settings` guarda la imagen de OpenGraph pero no un emblema
   para la cabecera.
5. **La portada enseña texto oculto.** `/api/public/home` usa `getPage`, no
   `getPublishedPage`: si marcas la portada como no visible, sus textos siguen saliendo.
   Ya estaba anotado como pendiente de la fase anterior; se cierra aquí.

---

## Fase 1 — La raíz cambia de sitio

Es la fase que más archivos toca y la que menos código nuevo escribe.

- `src/routes/_authenticated/` pasa a llamarse `src/routes/admin/`. Su `route.tsx` sigue
  siendo el mismo guardián, ahora sobre `/admin`. Todo lo que colgaba de él conserva su
  nombre: `/works` se convierte en `/admin/works`, y así las veinte pantallas.
- Se actualizan los destinos internos: 20 en el menú lateral, 24 en navegaciones y
  redirecciones, 4 en enlaces. Ninguno es ambiguo; el compilador de rutas de TanStack los
  verifica uno a uno.
- Tras iniciar sesión ya no se vuelve a `/`, que ahora es pública, sino a `/admin`.
- Nace `src/routes/_public/`: una envoltura sin ruta propia con la cabecera y el pie del
  sitio, y dentro `index.tsx` como nueva portada.
- **El origen se unifica.** nginx pasa a servir `/api` contra la API, y Vite hace lo mismo
  en desarrollo. Deja de haber dos orígenes: se acaba el problema de las imágenes, la
  cookie de sesión pasa a ser de primera parte y CORS deja de ser imprescindible.
  `PUBLIC_BASE_URL` pasa a ser la dirección del sitio, que es lo que hace que las
  direcciones de los archivos y la imagen de OpenGraph sean correctas.
- Además, y por si alguien despliega los dos por separado, el router público responde
  `Cross-Origin-Resource-Policy: cross-origin`. Solo el público: el administrativo se
  queda como está.

Al terminar esta fase la portada ya enseña datos reales, aunque sin el diseño.

**Se comprueba**: que `/` responde sin sesión; que `/admin` sigue redirigiendo a
`/sign-in`; que una imagen de `/api/public/media/…` se pinta de verdad en el navegador; y
que las veinte pantallas del panel siguen abriéndose en su dirección nueva.

### Hecha el 11 ago 2026

45 archivos con la ruta reescrita y 48 destinos internos actualizados. `pnpm verify` en
verde en los dos proyectos: **252 pruebas** en el backend (dos nuevas, sobre la cabecera
de incrustación) y **127** en el panel (siete nuevas, sobre la portada).

Verificado con peticiones reales y con un navegador de verdad:

- **17 comprobaciones** contra la API a través del sitio: la raíz responde sin sesión, el
  panel responde 401, el inicio de sesión funciona por el mismo origen, y una imagen
  subida como pública aparece en la portada, se descarga como PNG y llega con la
  cabecera que permite pintarla. Al borrarla deja de servirse.
- **7 comprobaciones** en Chromium: la raíz pinta la portada, no hay ni un enlace al
  panel, `/admin` y `/admin/works` mandan a identificarse conservando el destino, y
  ninguna petición de la portada falla.
- **23 pantallas** del panel abiertas una a una con sesión, todas en su dirección nueva,
  sin errores de JavaScript.

Dos cosas se decidieron sobre la marcha:

- **Las páginas de error siguen apuntando a `/`.** «Volver al inicio» ahora significa la
  portada pública, que es lo que dice el botón. Antes llevaba al panel.
- **El pie del sitio vive de momento dentro de la portada**, no en la envoltura, porque
  sus datos solo salen de `/api/public/home`. Sube en la fase 3, con `/api/public/site`.

## Fase 2 — El tema del sitio

- `web/src/styles/site.css` con los tokens del diseño en un espacio propio: `site-primary`,
  `site-surface`, `site-display-lg`… El panel usa `bg-primary`; el sitio, `bg-site-primary`.
  Se solapan cero. Sin esto, un solo nombre repetido repinta el panel entero.
- Playfair Display se añade a la carga de fuentes que ya existe.
- El sitio es siempre claro. El interruptor de tema del panel no lo alcanza, porque sus
  colores son literales y no variables que cambien con la clase `dark`.
- Piezas propias: botón, etiqueta, tarjeta, encabezado de sección, friso y separador. No se
  reutilizan los componentes del panel para lo visible: llevan otro radio, otra tipografía
  y otro comportamiento en oscuro.
- Cabecera (emblema o nombre del sitio, menú, versión móvil) y pie a tres columnas.
- **Se elimina toda imagen remota de la plantilla**: las cuatro son enlaces temporales de
  Google. La textura y el separador pasan a ser el friso SVG; el retrato y el emblema
  salen de la base de datos.
- `site_settings.logo_media_id`: una columna nueva, opcional, con su selector en Ajustes
  del sitio. Sin logotipo, la cabecera enseña el nombre.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **252 pruebas** en el backend y **129** en el
panel (dos nuevas, sobre el pie). Migración `20260811150000_site_logo` aplicada con copia
previa; las dos claves foráneas compuestas de RN-006, el índice único de departamentos y
el de búsqueda siguen en su sitio, y las 33 tablas también.

**11 comprobaciones** contra la API real sobre el emblema: se guarda y se relee, se
descarga sin sesión, **un archivo privado puesto como emblema no se sirve** (404, no 403),
y borrar el archivo que el sitio está usando devuelve 409 diciendo por qué. Todo se
deshizo al terminar.

En el navegador: la portada con el diseño, en escritorio y en móvil; el panel en tema
oscuro, intacto; y el sitio público con la clase `dark` forzada, que no le afecta.

Dos cosas que la plantilla traía mal y aquí no se copiaron:

- **El friso del pie era invisible.** Está dibujado en el mismo azul que el fondo del
  pie, y encima la plantilla le bajaba la opacidad. Hay dos versiones, clara y oscura.
- **Una columna del pie sin nada dentro pintaba su título igual**, con el hueco debajo.
  Ahora no se pinta (ERS §55).

Y una decisión: **no hay menú de hamburguesa**. La plantilla lo dibuja, pero con tres o
cuatro entradas de doce píxeles caben en cualquier móvil; un menú que hay que abrir para
ver tres palabras estorba más de lo que ayuda.

Encontrado de paso, sin relación con esta fase: **el historial de migraciones estaba
desincronizado**. Las seis migraciones de la sesión anterior se habían aplicado a mano y
la tabla `_prisma_migrations` no las conocía, con una además marcada como empezada y no
terminada. Se reconciliaron con `migrate resolve --applied` tras comprobar una por una que
sus tablas y columnas existían. Ya no bloquea el despliegue.

## Fase 3 — Home

Cada cosa que se ve, de dónde sale:

| En la plantilla | De dónde |
| --- | --- |
| Antetítulo «Department of Economics» | `page.eyebrow`, y si está vacío el departamento de la afiliación principal |
| Nombre grande | `profile.fullName` |
| Párrafo | `profile.shortBio` |
| «CV» / «Research» | `profile.cvUrl`, que se elige en Perfil académico / la página de Research, si está encendida |
| Imagen junto al título de Research y de Teaching | `page.heroUrl` y `page.heroAlt`, en Contenido de páginas → esa página |
| Retrato | `profile.photoUrl` |
| «Research lines», tres columnas | El cuerpo, de `page.secondaryHtml` en Contenido de páginas; el rótulo, del de la banda `home.research_areas` si el titular escribió uno |
| Publicaciones destacadas | `featuredWorks` (año, revista, título, autores) |
| «Mentorship & Pedagogy» + cita | `page.introHtml` |
| Cursos actuales | `featuredCourses` (código y título) |
| Pie: repositorios, CV, contacto | `profile.scholarUrls`, `orcid`, `cvUrl`, `publicEmail`, `links` |
| Línea de copyright | `settings.footerText` |

Lo que se hace en el backend:

- **`GET /api/public/site`**: nombre, pie, logotipo, correo de contacto, título y
  descripción por defecto, imagen de OpenGraph y los interruptores de filtros. Es lo que
  permite que la cabecera y el pie sean iguales en las cuatro páginas sin pedir la portada.
- `/api/public/home` pasa a usar `getPublishedPage`: si ocultas la portada, sus textos
  dejan de salir. Los destacados y el perfil siguen viéndose; lo que se oculta es el texto.
- Las secciones que el titular apaga (`showHomeFeaturedWorks`, `showHomeFeaturedCourses`)
  no se pintan.
- Estados vacíos con explicación, nunca un hueco mudo (ERS §55).

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **257 pruebas** en el backend (cinco nuevas,
sobre la portada) y **134** en el panel (siete nuevas, sobre la envoltura). Sin migración:
esta fase no toca la base de datos.

**24 comprobaciones** contra la API real, todas en verde. Las que importan:

- **Ocultar la portada ahora oculta de verdad.** Se le puso un texto reconocible, se
  comprobó que se servía, se ocultó la página y se comprobó que ya no aparece por ninguna
  de las dos puertas: ni dentro de `/api/public/home` ni en `/api/public/pages/home`, que
  responde 404. Era el pendiente que venía de la fase anterior.
- **Y solo oculta sus textos**: el perfil y los destacados siguen sirviéndose, y la
  portada responde 200 en lugar de desaparecer entera.
- **Lo que se cambia en el panel cambia en el sitio**: nombre y pie modificados y
  comprobados en el endpoint público, y devueltos a su valor original al terminar.
- Ningún identificador de archivo se escapa por el endpoint nuevo: solo direcciones ya
  construidas.

En el navegador: la cabecera con emblema y nombre, y el pie, ahora en la envoltura. La
portada hace **dos peticiones** —`/api/public/home` para su cuerpo y `/api/public/site`
para el cromo—, que es el precio de que Research y Teaching no tengan que pedir la portada
entera para pintar su pie.

Dos cambios de contrato, ninguno consumido todavía por nadie más:

- `/api/public/home` devuelve `page: null` cuando los textos están ocultos, en vez de
  fallar o servirlos igual.
- Sus `settings` se quedan en los dos interruptores de la portada. El nombre del sitio y
  el pie pasaron a `/api/public/site`, para que hubiera una sola fuente.

## Fase 4 — Research

Listado agrupado por tipo y paginación.

> **La barra de filtros se retiró.** Lo que sigue describe cómo quedó la página; el
> porqué y lo que se quitó están en [research-por-tipo.md](research-por-tipo.md). La API
> conserva los filtros y las facetas, así que volver a montarla no tocaría el backend.

- Ruta `/research`. Lo único que viaja en la dirección es la página: sin filtros no hay
  más estado que conservar al copiar el enlace.
- Un apartado por tipo de trabajo, con el plural del tipo como rótulo. El orden de los
  apartados es el `sort_order` que el titular da a cada tipo en el panel, y dentro de
  cada uno mandan el año descendente (`sort=type` en la API).
- Sigue paginando en el servidor (PERF-001). Un tipo que se parta entre dos páginas
  repite su rótulo en la siguiente.
- Las fichas ocupan el ancho completo de la página, sin barra lateral que las estreche, y
  cada tipo se abre con una banda de color a todo el ancho de la ventana.
- Tarjeta: tipo, año, título, autores (`con X y Z`, o «autoría única», comparando con el
  titular del sitio), revista con volumen y número, PDF, DOI y desplegable de resumen.
- **El resumen se pide al abrirlo**, no en el listado. Una petición solo cuando alguien
  quiere leerlo, y a cambio se tiene todo: resumen completo, enlaces a código y datos,
  cita y BibTeX. El listado no engorda (PERF-002).
- Ficha propia en `/research/:slug`, que además es lo que hace indexable cada trabajo.
- En el backend: `volume`, `issue` y la dirección del PDF se añaden al resumen público.
  Tres campos, ninguna regla afectada.

**Filtros de selección múltiple**: la plantilla los dibuja como casillas. La API acepta un
tipo y una etiqueta, no varios. Se implementan como selección simple, que con las facetas
delante se comporta igual de bien, y se deja anotado lo que costaría el cambio: tocar las
consultas del repositorio público y sus facetas, que es justo el código donde vive RN-001.
No es sitio para un cambio de conveniencia.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **257 pruebas** en el backend y **156** en el
panel (veintidós nuevas: formato de autoría y referencia, la tarjeta con su desplegable y
los filtros). Sin migración.

**30 comprobaciones** contra la API real y **15 en Chromium**. Las que importan:

- **RN-001, por las dos puertas.** Un borrador creado a propósito no aparece en el
  listado y su ficha responde 404 tanto por slug como por identificador. Al publicarlo
  aparece; al archivarlo desaparece otra vez y su ficha vuelve a dar 404. Todo deshecho
  al terminar. De paso quedó comprobado que **sin autor no deja publicar** (RN-002).
- **El resumen no viaja en el listado** (PERF-002), comprobado en el propio JSON. En el
  navegador: abrir el desplegable pide la ficha **una sola vez**, y cerrarla y volver a
  abrirla no vuelve a pedirla.
- **Todo el estado vive en la dirección.** Elegir un tipo lo escribe en la dirección,
  recargar lo conserva, el botón de volver lo quita, y la barra lateral lo muestra
  elegido después de recargar.
- Un tipo inexistente devuelve lista vacía en lugar de un error, y una búsqueda con
  comillas y guiones no rompe la consulta de texto.

Tres cosas del backend que hicieron falta:

- **`volume`, `issue` y `pdfUrl` en el resumen.** Sin ellos la tarjeta no podía escribir
  «QJE, Vol. 139 (2)» ni enlazar el PDF; `hasPdf` era solo un booleano. PERF-002 excluye
  la lista de archivos, no una dirección.
- **Los tipos de archivo y de enlace salen con su nombre.** La ficha enseñaba el código
  interno, «PAPER_PDF», que es justo lo que los presenters existen para evitar. Ahora se
  resuelven contra los catálogos que el titular edita, incluidos los términos ocultos:
  un archivo guardado con un término que después se ocultó sigue mostrando su nombre.
- El filtro de año se apoya en las facetas, así que solo salen años que tienen algo.

Y algo que se descubrió comprobando: **no hay «despublicar»**. Lo que retira un trabajo
del sitio es archivarlo. Funciona, pero conviene saberlo antes de buscar un botón que no
existe.

## Fase 5 — Teaching

- Ruta `/teaching`, agrupada por nivel, como la plantilla: seminarios de posgrado primero,
  grado después.
- Para que esos títulos de grupo y su descripción **también se gestionen desde el panel**,
  el nivel se convierte en un catálogo (`course_level`) usando la tabla `catalog_terms` que
  ya existe, más una columna `description`. El nivel del curso sigue siendo texto libre sin
  clave foránea, igual que el resto de catálogos: un valor que no esté en la lista se
  muestra igual, en su propio grupo.
- Tarjeta: código, periodo, título, punto de activo o histórico, resumen, etiquetas, y los
  accesos a guía y materiales.
- Al desplegar se pide la ficha: descripción, todas las ediciones con sus fechas, quién la
  impartió y los materiales públicos.
- Ficha propia en `/teaching/:slug`.
- Los filtros por institución, departamento y etiqueta solo aparecen si
  `showTeachingFilters` está encendido.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **257 pruebas** en el backend y **171** en el
panel (quince nuevas: la tarjeta de curso y el agrupado). Migración
`20260811160000_catalog_description` aplicada con copia previa: una columna opcional,
nada que convertir.

**31 comprobaciones** contra la API real y **14 en Chromium**, montando un curso completo
—institución, curso, edición y material— y deshaciéndolo entero al terminar. Las que
importan:

- **RN-001 en las tres capas.** Un curso en borrador no sale y su ficha da 404. Publicado
  aparece. Dentro de un curso publicado, **una edición en borrador no se ve** y **un
  material privado tampoco**: se les puso un título reconocible y se comprobó que no
  aparece en el JSON.
- **RN-005 de paso**: con el curso en borrador, la API no deja publicar su edición.
- La descripción larga no viaja en el listado; desplegar la tarjeta pide la ficha una
  sola vez.
- «Solo en curso» viaja en la dirección y sobrevive a una recarga; al desactivar la
  edición, el curso deja de salir con ese filtro pero sigue saliendo sin él.
- La entradilla de un grupo se editó desde el panel y **apareció en la web** en la misma
  pasada, con su etiqueta del catálogo.

Lo que hizo falta en el backend:

- **`catalog_terms.description`**, para que el título y la entradilla de cada grupo se
  gestionen desde Catálogos en vez de estar escritos en el código. Sirve para cualquier
  catálogo; los demás la dejan vacía.
- **El catálogo `course_level`**, sembrado con cinco niveles y con entradilla en los dos
  que la plantilla usa. `courses.level` **sigue siendo texto libre**: un nivel importado
  que no figure en la lista sale igual, con su propio texto y al final, en vez de esconder
  el curso. Hay una prueba que lo fija.
- **`code` en el resumen** —el de la edición vigente, y si no el habitual del curso— y
  **`typeLabel` en los materiales**, para que la ficha no enseñe `syllabus` sino «Guía
  docente».

## Fase 6 — Eventos

No hay plantilla para esto, pero el módulo existe y se gestiona desde el panel: dejarlo
invisible sería un agujero.

- `/events` y `/events/:slug`, en el mismo lenguaje visual que Research.
- Bloque de próximos eventos en la portada, solo si hay alguno publicado.
- La entrada del menú aparece solo si hay eventos publicados: un menú con una sección
  vacía es peor que un menú de tres entradas.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **258 pruebas** en el backend y **180** en el
panel (nueve nuevas: la tarjeta de evento, su botón y el rango de fechas). Sin migración.

**23 comprobaciones** contra la API real y **11 en Chromium**, creando dos eventos —uno
futuro y uno pasado— y borrándolos al terminar. Las que importan:

- **RN-001**: en borrador no salen y su ficha da 404; publicados aparecen; archivados
  vuelven a desaparecer y su ficha vuelve a dar 404.
- **El menú y la portada se enteran solos.** `/api/public/site` trae `features.events`,
  que se enciende cuando hay algo publicado: se comprobó apagada, encendida y apagada
  otra vez al borrarlos. La portada trae los próximos eventos por la misma vía, sin un
  interruptor propio que mantener.
- El filtro de próximos deja fuera lo que ya pasó, tanto en el listado como en la
  portada.

**Un fallo encontrado al mirarlo.** Los eventos se ordenaban siempre por fecha
descendente, así que «próximos eventos» enseñaba primero **el más lejano**: el congreso
de dentro de dos meses por delante del seminario de la semana que viene. El sentido
ahora depende de hacia dónde se mira: ascendente en lo que está por venir, descendente
en lo ya pasado.

Y una observación, sin arreglar porque nada la necesita hoy: la API acepta los instantes
en UTC con `Z`, y rechaza el desplazamiento `+00:00`. El panel manda lo que produce el
navegador, así que funciona; un importador que mandara desplazamientos, no.

## Fase 7 — Que se encuentre (ERS §39)

- Por cada ruta: `<title>`, descripción, canónica, OpenGraph y tarjetas de X, con los
  valores por defecto de Ajustes del sitio y los propios de cada ficha.
- JSON-LD: `Person` en la portada, `ScholarlyArticle` en cada trabajo, `Course` en cada
  curso.
- `index.html` deja de anunciar «Shadcn Admin» y de apuntar a `shadcn-admin.netlify.app`.
- `sitemap.xml` y `robots.txt` generados por la API a partir de lo publicado, para que se
  actualicen solos cuando el titular publica algo.
- **ADR-0005** cierra el punto que ADR-0004 dejó pendiente. La recomendación: metadatos en
  tiempo de ejecución ahora —cubren todo lo que el ERS exige como obligatorio— y dejar
  documentado, con su coste, que renderizar el contenido en el servidor exigiría un
  proceso más en el despliegue. Prerenderizar en la compilación queda descartado por una
  razón concreta: obligaría a recompilar cada vez que el titular publica, que es
  exactamente lo contrario de lo que se pide.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **258 pruebas** en el backend y **186** en el
panel (seis nuevas, sobre el resumen para la meta descripción y el título). Sin migración.

**18 comprobaciones** contra la API real y **23 en Chromium**. Las que importan:

- **El sitemap se genera de lo publicado.** Un trabajo en borrador no está; al
  publicarlo aparece; al archivarlo desaparece. Comprobado en la misma pasada, con el
  trabajo borrado al terminar. Sale en `/sitemap.xml`, la dirección donde lo buscan los
  rastreadores, no bajo `/api`.
- `robots.txt` deja fuera `/admin` y apunta al sitemap. El sitemap no anuncia el panel.
- **Cada ruta escribe su juego completo de metadatos**: un solo `<title>`, canónica
  absoluta, OpenGraph, tarjeta de X y JSON-LD. En la portada `Person` con el ORCID y los
  perfiles; en un trabajo `ScholarlyArticle` con DOI y autores; en un curso `Course`; en
  un evento `Event`.
- **Y se limpian al salir**: navegando de una ficha al listado, ni el JSON-LD ni las
  etiquetas `citation_*` del trabajo se quedan colgando. Se comprobó también con el
  botón de volver.

Además de lo que pedía el ERS, la ficha de un trabajo lleva las etiquetas `citation_*`
de Highwire Press —título, autores, fecha, revista, volumen, DOI y la dirección del
PDF—, que son las que leen Google Scholar y los agregadores académicos.

**Y aquí está el límite, que ADR-0005 dice sin rodeos: Google Scholar no ejecuta
JavaScript.** Las etiquetas son las correctas y están bien puestas, pero un rastreador
que solo lee el HTML servido no las verá; lo mismo vale para las vistas previas de
enlace de X, LinkedIn o WhatsApp, que enseñarán el título de arranque. Google sí las ve.
Para cerrar eso hace falta el paso que ADR-0004 ya preveía, y el ADR nuevo deja las dos
formas con su coste para decidirlo con el sitio en producción.

## Fase 8 — Que aguante y no se escape nada

- **El límite de peticiones necesita separarse.** Hoy hay uno solo, 120 por minuto y por
  IP, compartido entre el panel y todo lo público. Una ficha con galería, o una oficina
  entera detrás de la misma IP, lo agota y las imágenes empiezan a fallar. Los archivos
  públicos, que son inmutables y ya se cachean un año, van aparte.
- nginx: política de contenidos para el sitio y caché de los archivos públicos en el
  proxy, para que no lleguen a Node.
- Repaso de fuga: ningún endpoint administrativo alcanzable sin cookie, ningún borrador
  visible, ninguna página oculta servida, ningún archivo privado descargable. Con
  peticiones reales, sin sesión.
- Accesibilidad (ERS §41): teclado, foco visible, textos alternativos y contraste, con
  atención a la sección oscura de la portada.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **260 pruebas** en el backend (dos nuevas,
sobre los límites separados) y **186** en el panel. Sin migración.

**29 comprobaciones** de fuga contra la API real, **15 sobre la política de contenidos** y
**22 de accesibilidad**.

**El límite de peticiones ya no es uno solo.** Era el riesgo que anoté al analizar: 120
por minuto y por IP, compartidos entre el panel y todo lo público. Una ficha con galería,
o una oficina entera detrás de la misma IP, lo agotaba y las imágenes empezaban a fallar.
Ahora lo público va aparte, con 600 por minuto configurables
(`PUBLIC_RATE_LIMIT_MAX`), y son contadores distintos. Sigue habiendo límite: sin él,
cualquiera podría vaciar el archivo a base de peticiones.

**Política de contenidos en nginx**, con `script-src 'self'`: aunque algo se colara por el
Markdown —que se sanea en el servidor—, un script en línea no se ejecutaría. Comprobada
contra la compilación real, no contra el servidor de desarrollo: se sirvió `dist/` con la
misma cabecera que pondrá nginx y se recorrieron las cuatro páginas públicas, el inicio de
sesión, seis pantallas del panel y un diálogo, sin una sola violación, con las fuentes de
Google cargando.

**El repaso de fuga**, todo sin sesión: las 19 familias administrativas responden 401 —y
una ruta inventada también, para no revelar qué existe—; lo público rechaza POST, PATCH,
PUT y DELETE; ninguno de los seis endpoints públicos filtra `editorialStatus`,
`createdBy`, `storageKey` ni ningún otro campo interno. Y **la cadena de RN-001 en los
archivos, entera**: un archivo privado da 404; uno público que no cuelga de nada, 404; uno
público colgando de un **borrador**, 404; al publicar el trabajo pasa a 200; al archivarlo
vuelve a 404.

**Dos cosas de accesibilidad que había que arreglar**, encontradas midiendo, no mirando:

- **El acento terracota no llegaba al contraste mínimo sobre fondo claro**: 3,3:1, cuando
  WCAG AA pide 4,5 para texto. Se usaba en el estado académico de cada trabajo, en «en
  curso» y en los enlaces al pasar. La propia paleta traía el tono para texto sobre claro
  —`on-tertiary-fixed-variant`—, que da 8,9:1. Sobre la sección oscura se queda el
  original, que ahí da 5,6:1.
- **El foco de los campos casi no se veía**: se marcaba cambiando el borde de gris a
  terracota, dos tonos demasiado parecidos. Ahora llevan un contorno de verdad.

Lo demás salió bien de origen: un solo `h1` por página, todas las imágenes con `alt`,
todos los campos con nombre accesible, el ornamento oculto a los lectores de pantalla, y
se llega al desplegable del resumen solo con el tabulador y se abre con Enter.

**Lo que no se hizo, y por qué**: caché de los archivos en el proxy. `proxy_cache_path` va
en el contexto `http` de nginx y este archivo es solo un `server`; habría que tocar la
imagen. A cambio no hace falta: los archivos ya salen con `max-age` de un año e
`immutable`, así que el navegador y cualquier CDN los guardan igual.

---

## Cómo se verifica

El método que ha encontrado todos los fallos hasta ahora: peticiones reales contra la base
de datos real, no dobles de prueba. Se le suma lo que aquí es nuevo —que esto se ve— con
pruebas de navegador para el estado de los filtros en la dirección y para los estados
vacíos.

Y una comprobación que atraviesa todas las fases, porque es la petición de fondo: **cambiar
algo en el panel y confirmar que cambia en el sitio**. Publicar un trabajo y verlo
aparecer; despublicarlo y verlo desaparecer; cambiar el nombre del sitio, el pie, un texto
de página, un destacado, un término del catálogo.

---

## Resultado (11 ago 2026)

Las ocho fases están hechas y verificadas. `pnpm verify` en verde en los dos proyectos:
**260 pruebas** en el backend y **186** en el panel. **183 comprobaciones** contra la API
real repartidas entre las ocho fases, todas en verde en la pasada final, más los recorridos
de navegador de cada una.

Dos migraciones, cada una con copia previa: el emblema del sitio y la descripción de los
términos de catálogo. Ninguna convertía datos. Las claves foráneas compuestas de RN-006,
el índice único de departamentos y el de búsqueda siguen en su sitio; 33 tablas.

### Lo que hay ahora y antes no

| | |
| --- | --- |
| La raíz | El sitio público. El panel vive en `/admin` y el sitio no lo enlaza |
| Portada | Perfil, líneas de investigación, destacados, docencia y próximos eventos |
| Investigación | Listado con filtros en la dirección, facetas con recuento y ficha por trabajo |
| Docencia | Agrupada por nivel, con títulos y entradillas que se editan en Catálogos |
| Eventos | Listado, ficha y bloque en la portada; el menú aparece solo si hay algo |
| Que se encuentre | Metadatos por ruta, JSON-LD, `citation_*` y un sitemap que se genera solo |

### Ocho fallos encontrados por el camino

Ninguno salió de leer el código: todos de comprobar contra la API real o de mirar la
página en un navegador.

1. **Las imágenes públicas no se podían pintar** desde otro origen: la API responde
   `Cross-Origin-Resource-Policy: same-origin`.
2. **Ocultar la portada no ocultaba nada**: se leía con la versión del panel.
3. **La ficha enseñaba códigos internos**: «PAPER_PDF» en vez de «Artículo (PDF)».
4. **El friso del pie era invisible**, dibujado en el mismo azul que su fondo.
5. **Una columna del pie sin contenido** pintaba su título con el hueco debajo.
6. **«Próximos eventos» empezaba por el más lejano**, ordenado siempre descendente.
7. **El acento terracota no llegaba al contraste mínimo** sobre fondo claro: 3,3:1.
8. **El foco de los campos casi no se veía**, marcado solo con un cambio de borde.

### Lo que queda anotado

- **Sin renderizado en servidor, Google Scholar no lee las `citation_*`**, ni las vistas
  previas de enlace de X o WhatsApp leen los OpenGraph. ADR-0005 lo dice y deja las dos
  formas de resolverlo con su coste, para decidirlo con el sitio en producción.
- La caché de archivos en el proxy necesita tocar la imagen de nginx; los archivos ya se
  cachean un año en el navegador.
- La API acepta instantes en UTC con `Z` y rechaza el desplazamiento `+00:00`.
- En Ajustes del sitio, «Dirección» duplica `PUBLIC_BASE_URL` y no la usa nadie.
- Sigue sin haber repositorio git.

---

## Tres decisiones, con mi recomendación

1. **Un solo origen** (nginx sirve el sitio y hace de proxy de `/api`). Recomendado, y
   además es la forma limpia de arreglar las imágenes bloqueadas. La alternativa —dos
   orígenes y aflojar cabeceras— funciona, pero deja la cookie de sesión como de terceros.
2. **Filtros de selección simple** en Research para empezar. Recomendado: se comporta bien
   con las facetas y no obliga a tocar el código donde vive RN-001.
3. **Metadatos en tiempo de ejecución**, sin renderizado en servidor. Recomendado para
   esta entrega, con la puerta abierta y documentada.

Si prefieres otra cosa en cualquiera de las tres, se cambia antes de empezar la fase
correspondiente; ninguna es irreversible.

---

## Sigue sin haber repositorio git

Seis migraciones aplicadas y ninguna forma de volver atrás en el código. Este plan mueve
de sitio veinte pantallas del panel en su primera fase. Es un buen momento para
inicializarlo.
