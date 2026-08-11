# ADR 0005: Metadatos en el cliente, sin renderizado en servidor (por ahora)

## Status

Accepted

Cierra el seguimiento que dejó abierto ADR-0004: «al implementar las páginas públicas,
decidir y documentar la estrategia de prerenderizado».

## Context

`ERS.md` §39 pide para las páginas públicas: `<title>`, meta description, canonical,
OpenGraph, tarjetas de X y JSON-LD `Person`. Y añade, con una condición: «Research debe
poder renderizar metadatos de trabajos en HTML server-side **si el stack frontend lo
permite**».

El stack es una SPA de Vite + React (ADR-0004). Tal cual, el servidor entrega un HTML
vacío que se pinta con JavaScript.

Las tres salidas que ADR-0004 dejó anotadas se han vuelto a mirar con los requisitos
delante:

- **Prerenderizar las rutas en el build.** Se descarta. El contenido lo edita el titular
  a diario; prerenderizar en la compilación obligaría a recompilar y desplegar cada vez
  que publica un trabajo, que es exactamente lo contrario de lo que se pidió: que lo que
  se gestiona en el panel se vea en la web.
- **Usar el prerender del proveedor de despliegue.** No aplica: se despliega con nginx
  propio (`web/nginx.conf`), no en Netlify.
- **Una capa ligera de SSR solo para las páginas públicas.** Es la única que resuelve el
  problema entero. Cuesta un proceso más en el despliegue.

## Decision

Los metadatos se escriben **en el cliente**, por ruta, con
`features/site/use-site-meta.ts`. Cada página escribe el juego completo: título,
descripción, canónica, OpenGraph, tarjetas de X, JSON-LD y —en la ficha de un trabajo—
las etiquetas `citation_*` de Highwire Press.

Se escriben a mano sobre el `<head>` en lugar de dejarlo a React. React 19 sabe elevar
`<title>` y `<meta>`, pero los **añade**, y el `<title>` de `index.html` ya está ahí: el
navegador se queda con el primero, así que el de la ruta no se vería.

`index.html` conserva un título y una descripción de arranque, y nada más. No lleva
`og:*` ni `twitter:*` fijos a propósito: unos valores de plantilla servirían justo para
que un lector que no ejecuta JavaScript se llevara los genéricos en vez de ninguno.

El `sitemap.xml` y el `robots.txt` sí se generan **en el servidor**, a partir de lo
publicado, y nginx los sirve desde la raíz. Publicar un trabajo lo mete en el sitemap y
archivarlo lo saca, sin listas escritas a mano.

## Consequences

- Positiva: todo lo que §39 exige como obligatorio está, y cambia con lo que el titular
  edita, sin recompilar ni desplegar.
- Positiva: el sitemap no se puede quedar desfasado, porque no lo mantiene nadie.
- Positiva: no hay proceso nuevo que desplegar ni vigilar.
- **Negativa, y hay que decirla clara: Google Scholar no ejecuta JavaScript.** Las
  etiquetas `citation_*` están bien puestas y son las correctas, pero un rastreador que
  solo lee el HTML servido no las verá. Lo mismo vale para las vistas previas de enlace
  de X, LinkedIn, Slack o WhatsApp: enseñarán el título de arranque de `index.html`, no
  el del trabajo. Google sí ejecuta JavaScript y sí los ve.
- Negativa: por tanto, **para indexación académica fuerte falta un paso**, que es
  precisamente el que ADR-0004 preveía.

## Seguimiento

Cuando el sitio salga a producción con contenido real, decidir sobre el renderizado en
servidor de las rutas públicas. Lo que hay hoy no lo estorba: `use-site-meta.ts` describe
los metadatos como datos, así que una capa de SSR podría emitirlos sin reescribir las
páginas.

Dos formas, de menos a más:

1. **Renderizado solo para rastreadores** en nginx: detectar el agente y servir un HTML
   mínimo generado por la API. Barato, y suficiente para Scholar y para las vistas
   previas de enlace. A cambio, hay dos caminos que mantener.
2. **SSR de las rutas públicas** con un proceso Node delante. Resuelve todo de una vez y
   además mejora la primera pintura. Cuesta un servicio más.

El criterio para elegir: si lo que importa es que Scholar indexe los papers y que los
enlaces compartidos se vean bien, la primera basta. Si además importa el tiempo de
primera pintura, la segunda.
