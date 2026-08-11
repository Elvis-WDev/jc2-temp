# Plan: secciones que se encienden y se apagan

Tres cosas pedidas el 11 ago 2026, sobre el sitio público ya terminado:

1. Un **carrusel** en la portada para una selección propia de publicaciones.
2. Los **eventos en rejilla de tres columnas** al final de la portada, con portada e
   información completa.
3. Un **interruptor por sección y por página**, para encender y apagar desde el panel.
   La portada no se puede apagar; Research, Teaching y Eventos sí.

Tres fases. Cada una es utilizable por sí sola y se verifica contra la base de datos y el
navegador reales antes de pasar a la siguiente.

---

## Lo que no se toca

`editorial_status` sigue siendo la única puerta de la visibilidad de un contenido
(RN-001). Lo que se añade aquí es otra cosa y hay que no confundirlas:

- **El estado editorial** decide si un trabajo concreto existe para el público.
- **El interruptor de sección** decide si la web enseña ese bloque.

Un trabajo en borrador no se ve aunque la sección esté encendida. Y encender una sección
no publica nada. Son dos llaves distintas y ninguna sustituye a la otra.

---

## Las dos decisiones ya tomadas

**Al ocultar Research o Teaching, los enlaces directos siguen funcionando.** La sección
desaparece del menú, su listado responde 404 y sale del sitemap, pero
`/research/un-paper` se sigue abriendo. Es para lo que existe la estabilidad de
identificadores (RN-010): un DOI impreso o un correo enviado hace dos años no se rompen
porque este año decidas no enseñar el archivo completo.

**El carrusel tiene su propia selección**, aparte de los destacados. Un interruptor nuevo
por trabajo, para elegir uno o dos muy concretos que giran arriba, mientras la lista de
destacados sigue debajo con el resto. Son dos listas que mantener, y esa es la
contrapartida de poder decidir por separado qué encabeza la portada.

Y una que tomo yo: **el carrusel no se mueve solo.** Flechas, puntos, teclado y arrastre,
pero sin reproducción automática. En una web académica el movimiento es ruido, y además
un carrusel que gira solo incumple el criterio de accesibilidad que ya se cumple en el
resto del sitio (ERS §41).

---

## Fase 1 — Los interruptores

La fase con migración y la que más cosas mueve de sitio.

### Dónde viven

**Tabla nueva `page_sections`**: `page_key`, `section_key`, `is_visible`, `sort_order`,
con único `(page_key, section_key)`. Se siembra con las secciones que existen hoy.

**No es un constructor de páginas.** RF-020 lo prohíbe en el MVP y con razón: las
secciones las define el código, y esta tabla solo guarda si se ven y en qué orden. Una
clave que no conozca el código se ignora; una sección del código sin fila se considera
visible. Así, añadir una sección más adelante no obliga a migrar ni a tocar datos.

### Qué se puede encender y apagar

| Página | Secciones |
| --- | --- |
| Portada | Perfil · Carrusel · Líneas de investigación · Publicaciones seleccionadas · Docencia · Eventos |
| Research | Cabecera · Filtros |
| Teaching | Cabecera · Filtros |
| Eventos | Cabecera |

Los interruptores van en **Contenido de páginas**, junto a los textos de cada página, no
amontonados en Configuración del sitio. Se gestiona lo mismo en el mismo sitio.

### La página entera

`page_content.isPublished` pasa a significar **«esta página se ve»**, que es lo que se
ha pedido. Hoy significa otra cosa —solo oculta los textos de su cabecera— y eso pasa a
ser una sección más con su interruptor. No se pierde ninguna capacidad: se separan dos
cosas que estaban mezcladas.

**La portada no se puede ocultar.** La regla va en el dominio, no solo en el formulario:
un sitio sin raíz no es un sitio. En el panel el interruptor sale desactivado con su
explicación, y la API lo rechaza si alguien lo intenta por su cuenta.

**Eventos gana su fila** en `page_content`. De paso, su cabecera deja de estar escrita en
el código: hoy dice «Eventos / Seminarios, congresos y actividades académicas» a pelo,
que es exactamente lo que hemos quitado de todo lo demás.

### La migración

Los cuatro interruptores que hoy viven en `site_settings`
—`show_home_featured_works`, `show_home_featured_courses`, `show_research_filters`,
`show_teaching_filters`— **se convierten en filas de `page_sections` conservando su valor
actual**, y después se borran esas columnas. Dos fuentes para lo mismo es como se acaba
con una pantalla que dice una cosa y una web que hace otra.

Todo dentro de una transacción, con una comprobación que la aborta entera si algún valor
se queda sin convertir. Es el mismo patrón que usé al convertir el estado académico de
enum a tabla, y allí funcionó.

### Lo que cambia en la API

- `/api/public/site` pasa a decir qué páginas y qué secciones se ven. El menú del sitio
  lo lee de ahí, como ya hace con los eventos.
- **El listado de una página oculta responde 404**, no una lista vacía: si la sección no
  existe para el público, no existe. Las fichas siguen respondiendo, según lo decidido.
- El sitemap deja de anunciar la página oculta. Sus fichas se quedan: siguen siendo
  contenido válido y sus enlaces siguen vivos.

### Lo que se comprueba

Que apagar una sección la quita de la web y encenderla la devuelve, sin recompilar. Que
ocultar Research quita su entrada del menú, hace que `/research` responda 404 y lo saca
del sitemap, **pero que `/research/un-trabajo-publicado` se sigue abriendo**. Que la
portada no se puede ocultar ni desde el formulario ni llamando a la API a mano. Y, antes
y después de la migración, que los cuatro interruptores valen lo mismo que valían.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **266 pruebas** en el backend (cinco nuevas,
sobre las reglas de página y sección) y **188** en el panel (dos nuevas, sobre el menú).
Migración `20260811170000_page_sections` aplicada con copia previa. Las claves foráneas
compuestas de RN-006 y el índice de búsqueda siguen en su sitio; 34 tablas.

**22 comprobaciones** contra la API real y **12 en Chromium**, dejando todo como estaba
al terminar. Las que importan:

- **Los cuatro interruptores conservaron su valor** al convertirse en filas, y las
  columnas viejas ya no existen. La guarda de la migración comparaba origen y destino y
  habría abortado la transacción entera si alguno no hubiera cuadrado.
- **La portada no se puede ocultar**: la API responde 422 con `HOME_PAGE_ALWAYS_VISIBLE`
  y el interruptor del panel sale desactivado con su explicación.
- **Ocultar Research quita el índice y deja las fichas.** Comprobado por las tres
  puertas: `/api/public/research` responde 404, `/api/public/research/un-trabajo` sigue
  respondiendo 200, y el sitemap deja de anunciar `/research` pero mantiene la ficha.
- **Apagar la página apaga lo que hay dentro**: con Teaching oculta, sus secciones salen
  apagadas aunque su propio interruptor esté encendido.
- **Una sección apagada ni siquiera se consulta**: no es que no se pinte, es que no se va
  a la base de datos a por ella.
- En el navegador, de punta a punta: apagar Docencia en el panel y ver que desaparece del
  menú; encenderla y verla volver; apagar el bloque de docencia de la portada y verlo
  desaparecer.

**Un fallo encontrado al comprobarlo, y va más allá de esta fase.** El sitio cacheaba las
respuestas públicas cinco minutos. `must-revalidate` no impide que el navegador sirva de
su caché mientras la respuesta siga fresca: solo le obliga a preguntar cuando ya venció.
Resultado: apagabas algo en el panel y **durante cinco minutos parecía que el interruptor
no hacía nada** —exactamente la clase de fallo que este proyecto lleva corrigiendo desde
el principio—. El contenido público baja a un minuto y la cabecera con sus interruptores
a treinta segundos, que es lo que el titular acaba de tocar y va a mirar enseguida.

Y una decisión de forma: **los interruptores de sección se guardan al momento**, no con
el botón del formulario. Encender o apagar un bloque es una sola decisión, y esperar a
guardar los textos para verla aplicada confunde.

---

## Fase 2 — El carrusel

**`works.is_carousel` y `works.carousel_order`**, junto a los que ya existen para
destacar. En el panel, el interruptor va donde ya está el de destacado, para que se vea
de un vistazo que son dos cosas distintas y que un trabajo puede estar en las dos.

`/api/public/home` devuelve los del carrusel aparte de los destacados, con lo que la
tarjeta grande necesita: portada, tipo, año, título, subtítulo, autores, revista y el
enlace al PDF y al DOI.

En la portada, a lo ancho, con la portada del trabajo si la tiene y el fondo de la
sección oscura si no. Se pasa con flechas, con los puntos, con las flechas del teclado y
arrastrando en el móvil. **Sin reproducción automática.** Con un solo trabajo elegido no
se pintan ni flechas ni puntos: es una tarjeta grande, no un carrusel de uno.

Sin trabajos elegidos, la sección no se pinta. No hace falta apagarla para que
desaparezca, aunque también se pueda.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **268 pruebas** en el backend (dos nuevas,
sobre el carrusel en la portada) y **188** en el panel. Migración
`20260811180000_work_carousel` aplicada con copia previa: dos columnas con valor por
defecto, ningún trabajo cambia.

**17 comprobaciones** contra la API real y **12 en Chromium**, con tres trabajos de
prueba creados y borrados al terminar. Las que importan:

- **Un borrador no entra al carrusel**: 422 con `WORK_CAROUSEL_REQUIRES_PUBLISHED`, la
  misma regla que para destacar, porque el carrusel se ve igual de públicamente.
- **Son dos listas distintas.** Se comprobó con un trabajo en las dos y otro solo en el
  carrusel.
- **Archivar retira del carrusel**, igual que retira de los destacados: mantener ahí
  algo archivado dejaría RN-003 rota por otro lado.
- El orden es el que se indica, no el de creación.
- Apagar la sección desde Contenido de páginas vacía el carrusel sin tocar los trabajos.

En el navegador: tres diapositivas anunciadas como «1 de 3», las flechas y los puntos
mueven, el punto activo se marca, la flecha se apaga al llegar al final, las flechas del
teclado pasan de una a otra, y —comprobado esperando cuatro segundos— **no se mueve
solo**.

Una corrección de proporción al verlo con datos de verdad: a 48px, un título académico
real ocupaba cuatro líneas y descolocaba la diapositiva. A 32px sigue siendo grande y
cabe en dos.

---

## Fase 3 — Los eventos en rejilla

Al final de la portada, tres columnas, con la imagen de portada del evento arriba y
debajo el tipo, las fechas, el lugar, quién organiza, el resumen y su botón con el color
que se le haya puesto.

Muestra **los próximos**; si no hay ninguno por venir, los últimos celebrados, para que
la sección no quede vacía mientras haya historia que enseñar. Hasta seis, que son dos
filas. Si no hay ninguno de ninguna clase, la sección no se pinta.

Sustituye al bloque de tres tarjetas pequeñas que puso la fase 6 del plan anterior, que
era un anticipo de esto.

En móvil pasa a una columna; en tableta, dos. Cada tarjeta enlaza a su ficha, y la
sección tiene su enlace a la agenda completa —salvo que la página de Eventos esté
oculta, en cuyo caso no se enlaza lo que no se puede abrir.

### Hecha el 11 ago 2026

`pnpm verify` en verde en los dos proyectos: **270 pruebas** en el backend (dos nuevas,
sobre el respaldo de eventos pasados) y **190** en el panel (dos nuevas, sobre la
rejilla). Sin migración: la rejilla es presentación y el respaldo, composición.

**10 comprobaciones en Chromium** con eventos de prueba, borrados al terminar: la rejilla
está al final de la portada, con una tarjeta por evento, cada una con su tipo, su lugar y
su botón propio; tres columnas en escritorio y una en móvil, medidas sobre el estilo
calculado, no a ojo; y la tarjeta lleva a su ficha.

Dos detalles que salieron de mirarlo:

- **El título cambia con lo que hay.** Si la API cae en los últimos celebrados, llamarlos
  «próximos eventos» sería mentir: la sección dice «Últimos eventos». Hay una prueba que
  lo fija.
- **La banda de un evento sin portada era un rectángulo plano**, porque el motivo Moche
  está dibujado en azul oscuro y quedaba invisible sobre azul oscuro. Es la tercera vez
  que aparece lo mismo —ya pasó con el friso del pie—, así que ahora hay una versión
  clara del motivo y el problema deja de repetirse.

Y una decisión: la tarjeta entera no es un enlace. El botón propio del evento suele
apuntar a otro sitio —una inscripción, un programa—, y meterlo dentro de un enlace sería
un enlace dentro de otro. Enlaza el título.

---

## Cómo se verifica cada fase

El mismo método de siempre: peticiones reales contra la base de datos y un navegador de
verdad, no solo pruebas con dobles.

En la fase con migración se comprueba además, **antes y después**, que los cuatro
interruptores conservan su valor y que ninguna fila se queda sin convertir.

Y la comprobación que atraviesa las tres, porque es la petición de fondo: **apagar algo
en el panel y ver que desaparece de la web; volver a encenderlo y ver que vuelve.**

---

## Resultado (11 ago 2026)

Las tres fases están hechas y verificadas. `pnpm verify` en verde en los dos proyectos:
**270 pruebas** en el backend y **190** en el panel. **39 comprobaciones** contra la API
real y **34 en el navegador**, todas relanzadas al final.

Dos migraciones, cada una con copia previa. La primera convertía datos —los cuatro
interruptores de `site_settings`— con una guarda que habría abortado la transacción si
alguno no hubiera cuadrado; no hizo falta. Las claves foráneas compuestas de RN-006 y el
índice de búsqueda siguen en su sitio; 34 tablas.

### Lo que hay ahora y antes no

| | |
| --- | --- |
| Carrusel | Selección propia de publicaciones, aparte de los destacados, sin movimiento automático |
| Eventos en la portada | Rejilla de tres columnas con portada, fechas, lugar, organizador y botón |
| Interruptores | Once secciones que se encienden y se apagan desde Contenido de páginas |
| Páginas | Research, Teaching y Eventos se pueden ocultar enteras; la portada no |
| Eventos editable | Su cabecera dejó de estar escrita en el código |

### Tres fallos encontrados por el camino

1. **La caché de cinco minutos hacía que los interruptores parecieran no funcionar.**
   `must-revalidate` no impide servir de la caché mientras la respuesta siga fresca. El
   contenido público baja a un minuto y la cabecera a treinta segundos.
2. **A 48px, un título académico real ocupaba cuatro líneas** y descolocaba la
   diapositiva del carrusel.
3. **El motivo Moche era invisible sobre fondo oscuro**, por tercera vez. Ahora hay una
   versión clara y deja de repetirse.

---

## Lo que esto no incluye

- **Reordenar las secciones desde el panel.** La tabla guarda el orden y lo respeta, así
  que la puerta queda abierta, pero la pantalla para arrastrarlas no entra aquí.
- **Secciones nuevas creadas desde el panel.** Eso sí sería un constructor de páginas, y
  el ERS lo deja fuera del MVP a propósito.
- **Un carrusel de cualquier cosa.** Es de publicaciones. Si algún día hace falta uno de
  eventos o de cursos, será otro trabajo.
