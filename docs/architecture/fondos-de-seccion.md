# Fondos de seccion

Cada bloque del sitio publico puede llevar una imagen de fondo, elegida desde el panel.

## Antes no habia ninguna imagen

Lo que parecia un fondo era un zigzag SVG incrustado en `styles/site.css` (`site-texture`),
dibujado al 3-4 % de opacidad. No habia ningun fichero que sustituir. Las plantillas
originales si cargaban una fotografia de piedra tallada, pero desde un servidor de Google
que iba a caducar, y se sustituyo por el motivo vectorial.

**Ese motivo ya no se usa como fondo de seccion.** Sin imagen, la banda se pinta con su
color liso. El friso (`SiteFrieze`) que separa las bandas y remata el pie **si sigue**:
es un elemento decorativo entre secciones, no un fondo. La banda con motivo de las
tarjetas de evento sin portada tambien se queda: es el hueco de una imagen que falta, no
un fondo de seccion.

## Donde se elige

**Panel → Page content → *una pagina* → cada bloque.** Junto al interruptor de
visibilidad, cada bloque que admite fondo tiene su selector de imagen y su mando de
oscurecimiento. Se guarda al momento, como el interruptor.

Las once secciones de `page_sections`; **nueve admiten fondo**:

| Pagina | Seccion | Fondo |
|---|---|---|
| home | hero, carousel, research_areas, featured_works, featured_courses, events | si |
| research | header | si |
| research | filters | no |
| teaching | header | si |
| teaching | filters | no |
| events | header | si |

Los filtros son una barra de controles: una foto detras solo estorbaria, asi que ni se
ofrece el campo (`admiteFondo` en `features/page-content/api.ts`).

**Las fichas de detalle heredan el fondo de la cabecera de su listado.** La ficha de un
trabajo usa `research.header`, la de un curso `teaching.header`, la de un evento
`events.header`. Es la misma pagina vista de cerca, y darle un mando propio a cada ficha
multiplicaria los sitios donde elegir una foto.

## La capa oscura no es opcional

Una fotografia clara detras de texto claro lo deja por debajo del contraste que exige
WCAG AA, y quien sube la foto no tiene por que saberlo. Por eso **toda imagen de fondo
lleva encima una capa de `site-primary`**, ajustable de 0 a 100 por seccion, con 45 de
partida. Para quitarla del todo hay que bajarla a 0 a proposito.

Ademas, **una banda con imagen invierte su texto**: lo que era oscuro sobre claro pasa a
claro sobre oscuro. Lo resuelve `tonoDeBanda()` en `features/site/use-section-background.ts`,
que devuelve las clases de titulo, cuerpo, meta y acento segun haya foto o no. El acento
cambia de tono ademas de color: el terracota oscuro (`#713618`) esta elegido para fondo
claro y sobre oscuro no llega a contraste.

Las tarjetas opacas —publicaciones destacadas, rejilla de eventos— no cambian: siguen
siendo blancas y su texto se lee igual sobre cualquier foto.

## Imagenes con transparencia

Debajo de la imagen se pinta un color solido antes de la capa oscura. Hace falta para
las imagenes recortadas —una cenefa, un logotipo sobre nada—: sin base, por los huecos se
ve el fondo claro de la pagina, y el texto de la banda, que con imagen pasa a ser claro,
deja de leerse. Con base, la parte transparente queda oscura y el contraste se sostiene
sea cual sea la imagen.

Es lo que permite usar las cenefas Moche del sitio anterior, que son PNG con
transparencia, como fondo de las cabeceras.

## Como viaja el dato

```
page_sections.background_media_id ──► SiteContentUseCases.getVisibility()
                                  └─► GetPublicSite.sectionBackgrounds
                                      └─► site.presenter: mediaId ──► URL
                                          └─► GET /api/public/site
                                              └─► useSectionBackground('home.hero')
```

El identificador del archivo **no sale** de la API: el presentador lo convierte en la
direccion `/api/public/media/{id}`, como con el resto de imagenes del sitio.

Solo aparecen en `sectionBackgrounds` las secciones que tienen fondo. Las demas no
necesitan ninguna entrada, y asi la web distingue "sin fondo" de "fondo vacio" sin
inventarse un caso.

## Borrar el archivo

Un archivo usado como fondo **no se borra sin querer**: la clave foranea es `RESTRICT` y
`countReferences` lo cuenta antes, asi que la API responde `MEDIA_IN_USE` diciendo que
esta en `section backgrounds`.

Un fondo hace su archivo **publicamente alcanzable** aunque su pagina este oculta: las
fichas de detalle heredan el fondo de la cabecera de su listado y se siguen abriendo
aunque el listado no aparezca en el menu.

## El campo que se retiro

`page_content.hero_media_id` y `hero_alt` existian desde el principio, se guardaban desde
el panel y `/api/public/pages/*` los devolvia como `heroUrl`/`heroAlt`. **Ningun componente
del sitio los pintaba**: era un campo muerto, del mismo tipo que el titulo de la pagina de
eventos. Su trabajo lo hace ahora el fondo de la seccion `header`, que si se pinta, asi
que el campo se ha quitado del formulario.

Las columnas se quedan en la base sin usar: borrarlas es una migracion destructiva que
nadie ha pedido.
