import { useEffect } from 'react'

/**
 * Metadatos de la pagina (ERS §39): titulo, descripcion, canonica, OpenGraph, tarjetas
 * de X y JSON-LD.
 *
 * Se escriben a mano sobre el `<head>` en lugar de dejarlos a React: React 19 sabe
 * elevar `<title>` y `<meta>`, pero los **anade**, y el `<title>` de `index.html` ya
 * esta ahi; el navegador se queda con el primero, asi que el de la ruta no se veria.
 *
 * Cada pagina escribe el juego COMPLETO, siempre. No hay limpieza al desmontar a
 * proposito: con navegacion concurrente, la limpieza de la pagina que se va puede
 * ejecutarse despues del efecto de la que llega y borrarle sus etiquetas. Sobrescribir
 * entero es lo unico que no depende del orden.
 */

export interface SiteMeta {
  title: string
  description: string | null
  /** Ruta desde la raiz, con barra inicial. La canonica se construye con el origen. */
  path: string
  imageUrl: string | null
  type?: 'website' | 'article'
  /** Datos estructurados para los buscadores academicos. */
  jsonLd?: Record<string, unknown> | null
  /**
   * Etiquetas sueltas, para vocabularios que no son OpenGraph.
   *
   * Se usa para las `citation_*` de Highwire Press, que es lo que leen Google Scholar
   * y los agregadores academicos. Un mismo nombre puede repetirse —hay una etiqueta
   * por autor— asi que no se pueden tratar como las demas.
   */
  extraMeta?: Array<{ name: string; content: string }>
}

const ID_JSON_LD = 'site-json-ld'
/** Marca las etiquetas repetibles para poder retirarlas de golpe en la ruta siguiente. */
const MARCA_EXTRA = 'data-site-meta'

function upsertMeta(
  clave: 'name' | 'property',
  nombre: string,
  contenido: string | null
): void {
  const existente = document.head.querySelector<HTMLMetaElement>(
    `meta[${clave}="${nombre}"]`
  )

  if (contenido === null) {
    existente?.remove()
    return
  }

  const etiqueta = existente ?? document.createElement('meta')
  etiqueta.setAttribute(clave, nombre)
  etiqueta.setAttribute('content', contenido)
  if (existente === null) document.head.appendChild(etiqueta)
}

export function useSiteMeta(meta: SiteMeta | null): void {
  // Las dependencias van desmenuzadas: el objeto se crea nuevo en cada render y
  // compararlo entero volveria a escribir el head en cada pintada.
  const jsonLd = meta?.jsonLd == null ? null : JSON.stringify(meta.jsonLd)
  const extra = JSON.stringify(meta?.extraMeta ?? [])

  useEffect(() => {
    if (meta === null) return

    const canonica = `${window.location.origin}${meta.path}`
    const imagen = absoluta(meta.imageUrl)

    document.title = meta.title

    upsertMeta('name', 'description', meta.description)
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:url', canonica)
    upsertMeta('property', 'og:type', meta.type ?? 'website')
    upsertMeta('property', 'og:image', imagen)
    upsertMeta(
      'name',
      'twitter:card',
      imagen === null ? 'summary' : 'summary_large_image'
    )
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    upsertMeta('name', 'twitter:image', imagen)

    let enlace = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    if (enlace === null) {
      enlace = document.createElement('link')
      enlace.rel = 'canonical'
      document.head.appendChild(enlace)
    }
    enlace.href = canonica

    // Las repetibles se borran y se vuelven a poner enteras: si la ruta anterior dejo
    // cinco autores y esta tiene dos, quedarian tres colgando.
    for (const etiqueta of document.head.querySelectorAll(
      `meta[${MARCA_EXTRA}]`
    )) {
      etiqueta.remove()
    }
    for (const { name, content } of meta.extraMeta ?? []) {
      const etiqueta = document.createElement('meta')
      etiqueta.setAttribute('name', name)
      etiqueta.setAttribute('content', content)
      etiqueta.setAttribute(MARCA_EXTRA, '')
      document.head.appendChild(etiqueta)
    }

    const anterior = document.getElementById(ID_JSON_LD)
    anterior?.remove()
    if (jsonLd !== null) {
      const script = document.createElement('script')
      script.id = ID_JSON_LD
      script.type = 'application/ld+json'
      script.textContent = jsonLd
      document.head.appendChild(script)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    meta?.title,
    meta?.description,
    meta?.path,
    meta?.imageUrl,
    meta?.type,
    jsonLd,
    extra,
  ])
}

/** Las direcciones de OpenGraph tienen que ser absolutas para que se puedan resolver. */
function absoluta(url: string | null): string | null {
  if (url === null) return null
  return url.startsWith('http') ? url : `${window.location.origin}${url}`
}

/**
 * El texto plano de un HTML ya saneado, recortado.
 *
 * Lo usan la meta descripcion y el resumen que se despliega en una ficha. El corte busca
 * el ultimo espacio antes del limite: partir una palabra por la mitad se lee como un
 * error de la pagina, no como un recorte. Si no hay ningun espacio —una palabra
 * larguisima, o un texto sin espacios— se corta en seco, que es mejor que devolver algo
 * mas largo de lo pedido.
 */
export function resumirHtml(html: string | null, limite = 200): string | null {
  if (html === null) return null

  const contenedor = document.createElement('div')
  contenedor.innerHTML = html
  const texto = (contenedor.textContent ?? '').replace(/\s+/g, ' ').trim()

  if (texto === '') return null
  if (texto.length <= limite) return texto

  const cortado = texto.slice(0, limite - 1)
  const ultimoEspacio = cortado.lastIndexOf(' ')
  const base = ultimoEspacio > 0 ? cortado.slice(0, ultimoEspacio) : cortado

  return `${base.trimEnd()}…`
}

/** "Investigacion · Juan Castro". Sin nombre del sitio todavia, solo la seccion. */
export function titulo(pagina: string, siteName: string | undefined): string {
  return siteName === undefined ? pagina : `${pagina} · ${siteName}`
}

/**
 * Metadatos de una ficha que no se puede ensenar.
 *
 * Sin esto la pantalla se quedaba con el titulo y la descripcion de la pagina anterior,
 * y un buscador podia indexar «This work is not published.» como si fuera contenido. La
 * direccion responde 200 —en una aplicacion de una sola pagina no hay otra— asi que lo
 * que la mantiene fuera es `noindex`.
 */
export function metadatosDeNoDisponible(titulo: string): SiteMeta {
  return {
    title: titulo,
    description: null,
    path: window.location.pathname,
    imageUrl: null,
    extraMeta: [{ name: 'robots', content: 'noindex' }],
  }
}
