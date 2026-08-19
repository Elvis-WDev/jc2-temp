# News y blog

## Goal

Que el titular pueda publicar dos cosas que hoy no caben en la plataforma: **noticias**
—breves, sobre cualquier asunto— y **entradas de blog** personales, con texto enriquecido
y material adjunto. Todo administrado desde el panel, sin tocar nada de lo que ya existe.

**Desvío consciente del ERS.** El §45 pone `posts/blog` y `news` en la lista de lo que no
se debía modelar al principio. Se hace ahora a petición del titular, igual que se hizo con
Eventos. El resto del ERS se respeta: una sola entidad para lo que es lo mismo (RF-002),
estado editorial como única puerta a lo público (RN-001) y slugs estables (RN-010).

## Decisions

Las decisiones grandes, todas discutidas antes de escribir esto:

- **Una entidad, no dos.** Una noticia y una entrada de blog son estructuralmente lo
  mismo: título, imagen, texto, fecha y estado. Lo que cambia es el tono y el formato, que
  es editorial. Dos tablas duplicarían el CRUD, la ficha, el SEO, las reglas de slug y sus
  pruebas para guardar los mismos campos. Es la misma decisión que el ERS tomó en RF-002
  con `works`, y funciona.
- **El tipo sale de un catálogo** (`post_kind`, con `news` y `personal`), como los tipos de
  trabajo. Añadir mañana «Prensa» o «Charlas» será una fila desde el panel, no una
  migración. **Los dos códigos son reservados**: el código los conoce porque de ellos
  cuelgan las dos rutas públicas; un término nuevo necesitaría su ruta.
- **Eventos no se toca.** Un evento tiene fecha y lugar y su valor está *antes* de que
  ocurra; una noticia es un hecho y su valor está *después*. Meter noticias en `events`
  obligaría a inventar fechas y a arrastrar `location` y `organizer` que nunca aplican. Una
  noticia que anuncia un congreso **enlaza al evento**, no lo copia.
- **La diferencia entre news y blog vive en el formulario y en la ficha, no en el modelo.**
  News: título, imagen, resumen y fecha. Blog: además cuerpo enriquecido y adjuntos. El
  formulario enseña unos campos u otros según el tipo.
- **Vídeo incrustado, no alojado.** Comprobado: la entrega de archivos no admite peticiones
  por rango, así que un vídeo servido desde aquí no se podría adelantar y habría que
  descargarlo entero antes de verlo. Sumado al tope de 100 MB y a que todo vive en el disco
  del servidor, alojar vídeo es mal negocio. Se incrusta de YouTube o Vimeo.
- **Markdown por ahora, editor visual fuera de alcance.** El contenido ya se sanea en el
  servidor y se escribe en un cuadro de texto, como en eventos y cursos. Un editor con
  botones es un añadido solo del panel que no cambia ni el guardado ni el saneado: se
  decide aparte, cuando el blog esté en pie. **Pendiente de confirmación del titular.**
- **Los adjuntos copian a `work_files`**, que ya resuelve varios archivos por ficha con su
  etiqueta, su orden y su visibilidad. No se inventa nada.

## Tasks

### Fase 1 — Modelo y API

- [x] Tabla `posts`: `id`, `kind`, `title`, `slug` único, `summary`, `content_markdown`,
      `image_media_id`, `image_alt`, `editorial_status`, `published_at`, `display_order`,
      marcas de tiempo y de autoría.
- [x] Tabla `post_files`: `post_id`, `media_id`, `label`, `sort_order`, `is_public`.
- [x] **Una sola migración, escrita a mano.** Ver `docs/architecture/migraciones.md`: al
      generarla, Prisma propone además borrar las claves foráneas de RN-006, la única de
      `departments` y el índice de búsqueda. Esas líneas nunca se incluyen.
- [x] Sembrar el catálogo `post_kind` con `news` y `personal`.
- [x] **Tratar las dos columnas de archivo nuevas** en `countReferences` y en
      `isPubliclyReachable`. La prueba `mediaReferences.test.ts` fallará hasta que se haga:
      es su trabajo, no un estorbo.
- [x] Casos de uso con lo de siempre: publicar/archivar (RN-001), slug estable (RN-010)
      con `escribirConSlugLibre`, y Markdown saneado al presentar.
- [x] `GET /api/public/posts?kind=&page=` y `GET /api/public/posts/:idOrSlug`, con la
      lista blanca del presenter y paginación en servidor (PERF-001).
- [x] CRUD administrativo bajo `/api/admin/posts`, con su auditoría.
- [x] Añadir los posts publicados al sitemap.

**Hecha.** Dos fallos salieron de las sondas, no de las pruebas:

- `findPublished` esparcía `matchIdOrSlug(...)` —que devuelve un array— dentro del objeto
  `where`, de modo que llegaba a Prisma como `{0: {...}}` y **toda** ficha respondía 500.
  TypeScript no lo vio: esparcir un array en un objeto no dispara la comprobación de
  propiedades sobrantes. Va bajo `OR:`, como en eventos.
- `isPubliclyReachable` desestructuraba catorce consultas en trece nombres. La última
  —los adjuntos de un post— se quedaba fuera de la suma, así que un adjunto público de una
  entrada publicada no se descargaba nunca; y de paso la imagen del pie llevaba desde su
  incorporación contando bajo el nombre de otra cosa. Ahora las consultas van en un objeto
  con nombre y la suma es `Object.values`: añadir una entrada ya no puede desplazar a
  ninguna otra. `mediaReferences.test.ts` no podía cazarlo —comprueba que la columna se
  mencione, no que su recuento se sume—, y por eso el arreglo es estructural.

Queda fuera, por no ser de este plan: `EventUseCases.archive` pasa `null` como
`published_at`, con lo que archivar un evento borra la fecha en que salió a la web. Su
propio comentario dice que la conserva. En posts se hizo bien y hay prueba que lo fija.

### Fase 2 — El panel

- [x] Pantalla de posts con la tabla, el filtro por tipo y el flujo editorial, copiando la
      de Eventos, que es la más parecida y la más reciente.
- [x] **Dos entradas en el menú lateral, «News» y «Blog»**, que abren la misma pantalla con
      el filtro puesto. Para el titular son dos cosas; para el código, una.
- [x] Formulario que se adapta al tipo: en `news` no se enseñan ni el cuerpo ni los
      adjuntos, para que la pantalla no pida lo que esa forma no necesita.
- [x] Selector de imagen y bloque de adjuntos con el patrón de los archivos de un trabajo.

**Hecha.** La pantalla vive en `/admin/posts/$kind`, con el tipo en la dirección y no en
un filtro: desde «News» solo se ven y se crean noticias. `features/posts/kinds.ts` es la
única costura entre el segmento de la URL, el código del catálogo y lo que cambia de una
forma a otra —incluido `conCuerpo`, que decide si la tarjeta de cuerpo y la de adjuntos
existen—. Se añadió además el campo de orden fijado, que si no dejaba `display_order`
como columna que nadie podía tocar.

Un fallo real, del barrido: `GET /api/admin/catalog-terms?catalog=post_kind` respondía
422. La lista de vocabularios estaba escrita tres veces —el sembrador, la ruta del panel
y el cliente web—, y sembrar uno nuevo no bastaba para poder consultarlo. Las dos del
lado del servidor pasan a compartir `domain/catalog/catalogs.ts`.


### Fase 3 — Las dos páginas públicas

- [x] `/news` y `/blog`: **el mismo componente de listado**, con distinto filtro. Sin
      barra de filtros, coherente con lo que se decidió en Research.
- [x] `/news/:slug` y `/blog/:slug`: la misma ficha, con el cuerpo y los adjuntos cuando
      los hay.
- [x] **Las claves de página son un conjunto cerrado.** Para que estas dos tengan título,
      intro, imagen de cabecera y fondo de banda editables como el resto, hay que añadirlas
      en seis sitios: el tipo `PageKey` y `PAGE_KEYS`, los dos `z.enum` de
      `profile.schemas.ts`, `SECCIONES` de `PageRules`, el sembrador de `page_content`, y
      `PAGE_KEYS` del panel.
- [x] Que se puedan apagar desde el panel: `pages` en `GetPublicSite` y la lista de
      opcionales del menú del sitio.
- [x] Metadatos por página y por ficha con el hook de siempre.

**Hecha.** `PageKey` pasa a derivarse de `PAGE_KEYS` en lugar de escribirse aparte, y los
dos `z.enum` de `profile.schemas.ts` se derivan de esa misma lista: de los seis sitios que
había que tocar, tres eran copias que ahora no existen. El sembrador de `page_content`
importa `SECCIONES` en vez de repetirla —tenía un comentario pidiendo que coincidieran— y
`domain/posts/kinds.ts` es la única tabla de tipo → página, que consultan el sitemap y el
listado público.

El interruptor corta el listado y el índice del sitemap, no la ficha: un enlace que ya
circula se sigue abriendo (RN-010), igual que en trabajos. Como la ruta pública es una y
las páginas son dos, la comprobación no puede montarse como middleware fijo y se hace
dentro, con el tipo ya validado.

Nada que anotar del barrido salvo un despiste propio: `/api/public/site` se sirve con
`Cache-Control: max-age=30` y la pantalla de acceso ya lo pide, así que la sonda leía el
menú de antes de publicar. Es el comportamiento buscado; se arregló la sonda.

### Fase 4 — Multimedia

- [x] Documentar en el propio formulario que el vídeo se incrusta, con un ejemplo.
- [x] **Pedido por el titular:** aceptar audio en `UploadPolicy` (`audio/mpeg`,
      `audio/x-m4a`, `audio/ogg`), con reproductor en la ficha.
- [x] **Pedido por el titular:** imágenes intercaladas en el cuerpo, sólo de la biblioteca
      de este sitio.

**Hecha.** La fase empezaba con una premisa falsa: el vídeo **no se incrustaba**. El
saneador descartaba `iframe`, así que documentarlo habría sido documentar algo que no
ocurría. Ahora:

- `iframe` se acepta sólo hacia una lista de servidores de vídeo, y el `frame-src` de la
  CSP repite esa misma lista. Son las dos mitades de la decisión: la del servidor evita
  que se guarde, y la de la cabecera evita que se pinte si alguna vez se guardó. Sin la
  segunda el marco llegaba al navegador y el navegador lo bloqueaba, porque a falta de
  `frame-src` manda `default-src 'self'`.
- Una dirección de YouTube o Vimeo **sola en su línea** se convierte en reproductor. Sola
  en su línea a propósito: una citada de paso dentro de un párrafo sigue siendo un enlace.
  YouTube va por `youtube-nocookie.com`.
- **Audio:** `inlineSafe`, para que el navegador lo abra en lugar de bajarlo, y tope de
  30 MB. El límite lo pone que la entrega no admite peticiones por rango: el archivo se
  descarga entero antes de sonar. `audio/x-m4a` y no `audio/mp4`, que es lo que devuelve
  la detección por firma. En la ficha se reproduce con `preload="none"`.
- **Imágenes en el cuerpo:** estaban prohibidas del todo por una decisión anterior y
  documentada —una imagen alojada fuera le cuenta a ese servidor la IP de cada lector—. La
  regla nueva conserva esa propiedad: se acepta `img`, pero sólo apuntando a un archivo de
  la biblioteca, y la dirección se reescribe a ruta relativa, de modo que
  `//otro-sitio/api/public/media/<id>` acabe siendo de este origen.
- Eso obligó a **contar las citas en texto largo** en el guardián de archivos: una imagen
  intercalada no tiene columna propia, su única huella es la dirección escrita dentro del
  Markdown. Sin esto, pegar una imagen la dejaba respondiendo 404, y borrarla dejaba un
  hueco sin avisar. Se miran los diez campos que se renderizan en público, no sólo los de
  las entradas.
- El formulario tiene un botón que escribe el Markdown de la imagen donde estaba el
  cursor, y avisa si el archivo elegido no está marcado visible en la web.

`countReferences` pasa también a nombrar sus consultas en lugar de desestructurarlas por
posición, como se hizo en `isPubliclyReachable`: es el mismo fichero donde ese error ya
apareció dos veces.

### Fase 5 — Fuera del alcance, por si acaso

Se anotan para que se vea que se decidieron, no que se olvidaron:

- Editor visual en el panel.
- Etiquetas en los posts. La tabla `tags` ya existe: sería una tabla de enlace más.
- Tira de «Lo último» en la portada alimentada por los posts.
- Comentarios y RSS.

## Verification

- `corepack pnpm verify` en `api/` y en `web/` al cerrar cada fase.
- Fase 1: sondas contra el sistema en marcha. Un post en borrador **no** sale por
  `/api/public/posts`, ni por su slug, ni en el sitemap; su imagen y sus adjuntos no se
  descargan hasta publicarlo; al archivarlo dejan de descargarse.
- Fase 2: el barrido de pantallas del panel, sin errores de consola, y un alta y una
  edición reales de cada tipo.
- Fase 3: las dos páginas y dos fichas en el navegador, en escritorio y en móvil, y el
  interruptor de cada página apagando su entrada del menú.
- Al terminar: los datos de prueba se retiran, como en todo lo anterior.
