# El Home, como perfil profesional

## Goal

Que la portada hable **de la persona** y no de su producción. Hoy es un escaparate del
trabajo académico —carrusel de publicaciones, publicaciones destacadas, docencia y
agenda—, y eso ya lo cuentan Research, Teaching y Events, cada una en su página. El Home
pasa a responder una sola pregunta: quién es Juan Carlos Carbajal.

## Decisions

- **Lo académico sale del Home, no de la plataforma.** Research, Teaching y Events siguen
  intactas. Lo que se retira es su aparición en la portada.
- **La biografía completa se pinta por fin.** `fullBio` y la declaración de investigación
  se escriben en el panel, viajan en `/api/public/profile` y hoy **no se dibujan en
  ninguna página**: se guardan y se tiran. Son el núcleo del «who is», y por eso la banda
  nueva sale casi gratis.
- **Nada de textos escritos que se pierdan.** El `introMarkdown` de la portada hoy vive
  dentro de la banda de Docencia, que desaparece. Se recoloca como entradilla de la
  biografía en lugar de quedarse huérfano.
- **La trayectoria necesita datos nuevos en público.** De las afiliaciones sólo sale la
  principal, y en una línea del hero. Para una banda de cargos hace falta exponer la lista
  con institución, departamento, cargo y fechas. El repositorio ya la sabe leer; lo que
  falta es el DTO.
- **`/api/public/home` adelgaza.** Si el Home no pinta publicaciones ni cursos ni eventos,
  tampoco debe pedirlos: hoy son cuatro consultas por visita a la portada.
- **Las secciones retiradas no necesitan migración.** `listSections` ya descarta las claves
  que el código no dibuja, así que las filas viejas de `page_sections` dejan de aparecer en
  el panel solas. Se quedan en la base sin estorbar, y volver atrás es revertir código.
- **Queda maquinaria sin efecto, y se dice.** Marcar una publicación o un curso como
  destacado, su orden, y el «máximo en portada» de cada tipo de trabajo dejan de influir en
  nada visible. No se borran —serían columnas con datos y una migración—, pero un
  interruptor del panel que no hace nada es una trampa: en la fase 3 se decide si se
  esconden del formulario.

### Las bandas, en orden

| clave | qué es | de dónde sale |
|---|---|---|
| `hero` | Nombre, título, retrato, CV y Research | Perfil académico + `page_content` |
| `about` | **Nueva.** Quién es: entradilla y biografía larga | `introMarkdown` + `fullBio` |
| `research_areas` | En qué trabaja, dicho por él. No son publicaciones | `secondaryMarkdown` |
| `appointments` | **Nueva.** Cargos e instituciones, con fechas | Afiliaciones |
| `latest` | **Nueva.** Lo último de News y Blog | `posts` |

Fuera: `carousel`, `featured_works`, `featured_courses`, `events`.

## Tasks

### Fase 1 — Lo que la API tiene que dar

- [x] Exponer las afiliaciones en `/api/public/profile` y en la portada: institución,
      departamento, cargo, tipo y fechas. Sólo las públicas, con el orden que ya tienen.
- [x] Añadir a `/api/public/home` las últimas entradas de News y Blog, respetando el
      interruptor de cada página y que haya algo publicado, igual que hace el menú.
- [x] Pruebas de que una entrada en borrador no asoma por la portada, y de que apagar
      News o Blog la retira de ahí también.
- [ ] ~~Quitar de `GetHomePage` el carrusel, los destacados, los cursos y los eventos~~ →
      **movido a la fase 2.** Hacerlo aquí dejaría el sitio roto entre una fase y otra: el
      Home lee esos arrays y sin ellos la portada se queda en blanco. Se retira en el
      mismo cambio que retira las bandas.

**Hecha.** Tres cosas que no estaban en el plan:

- **La trayectoria sale entera, no sólo lo vigente.** Un cargo pasado no deja de ser
  cierto porque haya terminado. La principal se sigue eligiendo sólo entre las vigentes:
  un cargo terminado no encabeza el perfil.
- El orden lo pone el servidor —vigente primero y dentro de cada grupo lo más reciente—
  para que la portada y el perfil cuenten la misma historia sin que cada cliente lo
  reinvente. Sin fecha de inicio, al final de su grupo: no se puede afirmar que sea lo
  más reciente.
- `isCurrent` viaja aparte de las fechas a propósito: es lo que decide si se escribe
  «2019 — presente» o un rango cerrado, y no se deduce de una fecha de fin vacía, porque
  un cargo puede seguir vigente sin que nadie sepa cuándo acabará.

De paso, **dos consultas menos por visita**: `GetPublicProfile` volvía a buscar la
institución y el departamento de la afiliación principal uno a uno, cuando el repositorio
ya devuelve esos nombres resueltos al leer.

### Fase 2 — Las bandas del Home

- [x] Retirar las cuatro bandas académicas del Home y los componentes que sólo ellas
      usaban.
- [x] Quitar de `GetHomePage` el carrusel, los destacados, los cursos y los eventos, con
      sus consultas *(venía de la fase 1)*.
- [x] Banda **About**: entradilla y biografía, con el rótulo editable como el resto.
- [x] Banda **Appointments**: cargos con su institución y sus fechas, lo vigente primero.
- [x] Banda **Latest**: las últimas de News y Blog, con enlace a cada página.
- [x] Fondo por banda e interruptor por banda, como el resto.

**Hecha.** `/api/public/home` pasa de seis consultas a dos: sólo viajan `profile`, `page`,
`latestPosts` y `sections`. Se borraron `work-carousel.tsx`, `event-grid.tsx` y el
`SiteCard` que sólo usaban las bandas retiradas; `SiteChip` se queda, que lo usan las
fichas de Research y Teaching.

Detalles que decidió el código:

- La banda **About** no se pinta si no hay ni entradilla ni biografía, y la biografía
  ocupa el ancho entero cuando no hay entradilla: media banda vacía se lee como que falta
  algo. La entradilla es el `introMarkdown` que vivía dentro de Docencia, recolocado.
- **Appointments** escribe «2019 — Present» mirando `isCurrent`, no la ausencia de fecha
  de fin. Son cosas distintas: un cargo puede seguir vigente sin que nadie sepa cuándo
  acabará. Y no reordena nada: el orden llega resuelto del servidor.
- **Latest** son dos bandas, una por tipo, y cada una desaparece si su grupo llega vacío.
  Un encabezado sobre nada no informa de nada.

El barrido dio un falso negativo propio: la banda dice `2019 — PRESENT` porque el CSS la
pone en versalitas, e `innerText` devuelve el texto ya renderizado. Es el mismo tropiezo
que con el menú del sitio; se arregló la sonda.

### Fase 3 — El panel

- [x] Claves de sección nuevas en `PageRules`, en el sembrador y en `NOMBRE_DE_SECCION`
      del panel, con su explicación.
- [x] Decidir qué se hace con lo que deja de tener efecto: destacados de publicaciones y
      cursos, y «máximo en portada» de cada tipo de trabajo. **Decisión del titular:
      esconderlos del panel, sin tocar la base.**

**Hecha.** Las bandas de la portada son ahora `hero`, `about`, `research_areas`,
`appointments`, `latest_news` y `latest_blog`, todas con fondo y rótulo editables. Las
cuatro retiradas desaparecieron del panel solas: lo que no está en `SECCIONES` no se
dibuja ni se ofrece, así que no hizo falta migración y sus filas siguen en la base sin
estorbar.

Un cambio sobre lo diseñado: **`latest` se partió en dos**, `latest_news` y `latest_blog`.
Con un interruptor compartido, la banda tenía un mando en la API y otros dos —de fondo y
rótulo— en el panel, y apagar una de las dos tiras obligaba a apagar las dos. Ahora cada
tira es una sección completa, con su interruptor, su fondo y su rótulo.

**Lo que se escondió**, porque prometía un efecto que ya no existe:

- Destacar una publicación y ponerla en el carrusel, con su columna en la tabla.
- Destacar un curso, con su distintivo «En portada».
- El campo «cuántos en la portada» de cada tipo de trabajo.
- La métrica «Featured on home» del tablero.
- Y del lado del servidor, las consultas `listFeatured` y `listCarousel` en los dos
  repositorios públicos, sus casos de uso y sus puertos: nadie las llamaba ya.

Las columnas `is_featured`, `featured_order`, `is_carousel`, `carousel_order` y
`max_items_home` **se quedan en la base**, con sus datos. Cero migración, y volver atrás
es revertir código.

## Verification

- `corepack pnpm verify` en `api/` y en `web/` al cerrar cada fase.
- Fase 1: sondas contra el sistema en marcha. La portada no trae publicaciones ni cursos
  ni eventos; sí trae las afiliaciones públicas y las últimas entradas; un borrador no
  asoma; apagar News la retira.
- Fase 2: barrido del navegador en escritorio y en móvil, sin errores de consola, con las
  cinco bandas y con el interruptor de cada una apagándola.
- Fase 3: el barrido del panel, y que Contenido de páginas ofrezca las bandas nuevas y no
  las retiradas.
- Al terminar: los datos de prueba se retiran, como en todo lo anterior.
