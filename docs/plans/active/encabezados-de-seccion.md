# Encabezado editable de una banda

## Goal

Que el rótulo de una banda del sitio público se escriba desde el panel y no viva en el
código, empezando por «Research lines» / «Main areas» en la portada (ERS §2.2: los
textos de sección no se hardcodean).

El cuerpo de esa banda —las tres columnas— ya se editaba en Contenido de páginas →
Portada → «Secondary text». Lo único fijo eran los dos rótulos.

## Decisions

- **Dónde vive.** En `page_sections`, que ya guarda por banda si se ve, su fondo y su
  oscurecimiento. No en `page_content`, que es por página y no por banda.
- **Dos columnas nuevas, ambas opcionales**: `heading` y `heading_aside`. Vacías
  significa «el de la plantilla», así que ninguna sección cambia de aspecto al migrar y
  el titular puede volver al texto original borrando el campo.
- **Se ofrece solo donde tiene sentido.** El panel enseña los dos campos en las bandas
  marcadas con `admiteTitulo`, igual que ya hace con `admiteFondo`. Las bandas cuyo
  rótulo se calcula —«Upcoming events» cambia a «Past events» según lo que haya— se
  quedan fuera por ahora: dejar escribirlo obligaría a decidir qué gana, y nadie lo ha
  pedido.
- **Viaja aparte en la API pública**, como `sectionBackgrounds`: un mapa
  `sectionHeadings` con la misma clave `pagina.seccion`. Cambiar la forma de `sections`
  —hoy un simple booleano— obligaría a tocar todo lo que ya lo consume.

## Tasks

- [x] Columnas `heading` y `heading_aside` en `page_sections`, con migración.
- [x] Puerto y repositorio: leerlas y escribirlas.
- [x] `sectionHeadings` en `GET /api/public/site`.
- [x] `PATCH /api/admin/page-sections/:id` acepta los dos campos.
- [x] Contenido de páginas: dos campos de texto en la banda, que guardan al salir.
- [x] La portada usa el rótulo guardado y, si no hay, el de la plantilla.
- [x] Pruebas: valor guardado, valor vacío y recorte de espacios.
- [x] Verificación de `api/` y `web/`.

## Verification

- `corepack pnpm verify` en `api/` y en `web/`.
- Comprobado en la aplicación real: se escribe el rótulo en el panel, se recarga la
  portada y aparece; se borra y vuelve el de la plantilla.
