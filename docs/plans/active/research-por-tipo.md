# Research: sin filtros y agrupado por tipo

## Goal

Que `/research` sea un archivo que se lee de arriba abajo: sin barra de filtros, con los
trabajos agrupados bajo el tipo al que pertenecen y con las fichas ocupando el ancho
completo.

## Decisions

- **Se va la barra entera**: búsqueda, tipo, estado, tema y año. Con ella se va también
  la fila de «N results / Sort», porque el recuento ya está en la cabecera («Archive, 16
  works») y un selector de orden pelearía con el agrupado.
- **Desvío consciente del ERS.** RF-011 pide filtros combinables en `/research` y RF-012
  un selector de orden. El titular los ha retirado del sitio público. La API los
  mantiene: `/api/public/research` sigue aceptando `q`, `type`, `status`, `year` y `tag`,
  así que recuperarlos sería volver a montar la barra, sin tocar el backend.
- **El orden lo manda el titular**, no el código: se ordena por el `sort_order` de cada
  tipo de trabajo, que ya se ajusta en el panel (Research → Work types), y dentro de cada
  grupo por año descendente. Para eso la API gana un orden nuevo, `sort=type`.
- **Sigue paginando en el servidor** (PERF-001). Como los trabajos llegan ya ordenados
  por tipo, agrupar es recorrer la lista y abrir un grupo cada vez que cambia: un tipo
  que se parta entre dos páginas repite su rótulo, que es lo que se espera.
- **El rótulo del grupo es el plural del tipo** («Journal Articles»), que ya existe en
  `work_types.plural_label` justo para esto (ERS §14). La API lo entrega ahora en el
  resumen.
- **Cada rótulo es una banda de color a todo el ancho de la ventana**, en el azul del
  encabezado, con la misma letra que el título de la página —Playfair 700— pero un escalón
  por debajo: 32 px frente a los 48 del título. Con los dos a 48 competían entre sí.
- El margen lateral no vive en la sección, para que la banda llegue a los bordes, sino en
  un componente `Columna` que lo pone **por fuera** de la caja centrada, igual que la
  cabecera. Poniéndolo por dentro, la caja se centra a su ancho máximo y el contenido
  aparece desplazado a la derecha por el ancho del canalón: el listado entero salía 24 px
  más a la derecha que el título de la página.
- **La sección `research.filters` desaparece sin migración.** `PageRules.SECCIONES` ya
  declara que una fila con clave desconocida se ignora; ahora el listado del panel
  respeta esa regla, así que basta con sacarla de la lista. La fila que haya en la base
  se queda ahí sin molestar.

## Tasks

- [x] Orden `type` en la API y `plural_label` en el resumen.
- [x] La página pierde la barra de filtros y la fila de orden.
- [x] Los trabajos se agrupan por tipo, con su rótulo.
- [x] Las fichas ocupan el ancho completo.
- [x] Fuera el componente de filtros y su entrada en el panel.
- [x] Pruebas: agrupado, tipo partido entre páginas y sin filtros en pantalla.
- [x] Verificación de `api/` y `web/`.

## Verification

- `corepack pnpm verify` en `api/` y en `web/`.
- Comprobado en la aplicación real contra los 16 trabajos publicados.
