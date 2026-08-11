# Idioma

La plataforma se ve **entera en ingles**: el sitio publico y el panel de administracion.

## Que esta en ingles

| Capa | Donde | Como se cambia |
|---|---|---|
| Textos del sitio publico | `web/src/features/site/**` | Editando el componente |
| Textos del panel | `web/src/**` (resto) | Editando el componente |
| Mensajes de error de la API | `api/src/**` | Ya nacieron en ingles |
| Mensajes por codigo de error | `web/src/lib/handle-server-error.ts` | Un solo mapa |
| Etiquetas de los catalogos | Base de datos | Desde el panel, o el seeder |
| Fechas y numeros | `web/src/lib/locale.ts` | Una constante |

## Lo que sigue en castellano, a proposito

**Los comentarios y los identificadores del codigo.** `coautores()`, `rangoDeFechas()`,
`const eventosDePortada`. Es la convencion del repositorio y no la lee ningun usuario:
cambiarla tocaria 278 ficheros sin mover una sola letra de lo que se ve en pantalla.

Los nombres de las pruebas (`it('el menu solo ofrece las paginas visibles')`) tambien:
son documentacion para quien mantiene el codigo, no interfaz.

## Fechas: `web/src/lib/locale.ts`

```ts
export const LOCALE = 'en-AU'
```

Un solo sitio. `en-AU` y no `en-US` porque el dia va antes que el mes —"11 Aug 2026"— y
porque la zona horaria configurada es `Australia/Sydney`.

**No se usa el idioma del navegador.** Antes se hacia, con `toLocaleDateString(undefined)`,
y la agenda salia en castellano dentro de una pagina escrita entera en ingles. El idioma
de una interfaz lo decide la interfaz, no quien la visita.

## Catalogos: son datos, no codigo

Las etiquetas de los tipos de evento, los niveles de curso, los tipos de enlace y los
estados academicos viven en la base de datos (`catalog_terms`, `academic_statuses`), no
en el frontend. Por eso hicieron falta dos cosas:

1. **`api/src/infrastructure/database/seed/catalog-terms.seed.ts`** — para que una
   instalacion nueva nazca en ingles.
2. **La migracion `20260811190000_english_catalog_labels`** — para las bases que ya
   existen. Solo renombra lo que sigue teniendo el valor sembrado: si el titular ya lo
   reescribio a su manera, su texto manda.

Los estados academicos se sembraron dentro de `20260811100000_academic_status_table`,
que ya estaba aplicada. Una migracion aplicada no se edita; se anade otra.

## Si algun dia hay que traducir de verdad

Esto **no** es i18n: no hay diccionario, no hay `t()`, no hay segundo idioma. Es una
interfaz escrita en ingles. Anadir un segundo idioma es un trabajo aparte que empieza por
extraer las cadenas, y no se ha hecho porque nadie lo ha pedido.

Lo que si queda preparado: las fechas ya pasan por `LOCALE`, y las etiquetas de catalogo
ya son editables desde el panel sin tocar codigo.

## Como se comprueba

Un barrido busca palabras inequivocamente castellanas dentro de cadenas y de nodos de
texto JSX. Sobre las capturas del panel, ademas, se lee el texto renderizado de cada
pantalla y se busca lo mismo: es lo que encontro `Ir a la pagina 1`, que solo existia
dentro de un `sr-only` y no se ve mirando.
