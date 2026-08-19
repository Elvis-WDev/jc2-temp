import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

/**
 * Convierte Markdown a HTML seguro (ERS §37).
 *
 * El Markdown lo escribe el administrador, no un visitante, asi que esto no protege
 * de un atacante externo: protege de una cuenta comprometida, de contenido pegado
 * desde otra fuente y de un importador futuro. Sanear en el servidor tambien evita
 * que cada cliente tenga que acordarse de hacerlo.
 *
 * Lista blanca de etiquetas: lo que no esta permitido se elimina. Markdown estandar
 * no genera nada fuera de esta lista, asi que el contenido legitimo no se toca.
 */
const ETIQUETAS_PERMITIDAS = [
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'del',
  'sup',
  'sub',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]

/**
 * Los unicos sitios de los que se puede incrustar un reproductor.
 *
 * El video se incrusta y no se aloja: la entrega de archivos de aqui no admite
 * peticiones por rango, asi que un video servido desde el disco del servidor habria que
 * descargarlo entero antes de poder adelantarlo.
 *
 * Que sea una lista de servidores y no «iframe permitido» es lo que hace que esto siga
 * siendo seguro: un iframe hacia cualquier sitio es una pagina entera de otro dominio
 * dentro de la nuestra.
 */
const SERVIDORES_DE_VIDEO = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
]

/**
 * De donde puede venir una imagen intercalada en el texto: de aqui mismo.
 *
 * Una imagen alojada fuera le cuenta a ese servidor la direccion IP de cada visitante,
 * y ese era el motivo de que `img` estuviera prohibido del todo. La regla nueva conserva
 * la propiedad: se acepta la etiqueta, pero solo apuntando a un archivo de la
 * biblioteca, y ademas se reescribe a ruta relativa, de modo que aunque alguien pegue
 * `//otro-sitio/api/public/media/<id>` lo que quede sea una direccion de este origen.
 */
const RUTA_DE_MEDIA_PUBLICO =
  /^\/api\/public\/media\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function rutaDeMediaPublico(src: string | undefined): string | null {
  if (src === undefined) return null
  try {
    // La base ficticia solo sirve para poder separar servidor de ruta con las mismas
    // reglas tanto si la direccion es absoluta como si es relativa.
    const { pathname } = new URL(src, 'https://este-origen.invalid')
    return RUTA_DE_MEDIA_PUBLICO.test(pathname) ? pathname : null
  } catch {
    return null
  }
}

const OPCIONES: sanitizeHtml.IOptions = {
  allowedTags: [...ETIQUETAS_PERMITIDAS, 'iframe', 'img'],
  allowedAttributes: {
    // `rel` y `target` los anade transformTags; si no estuvieran permitidos aqui,
    // se eliminarian justo despues de anadirlos.
    a: ['href', 'title', 'rel', 'target'],
    iframe: ['src', 'title', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy'],
    img: ['src', 'alt', 'title', 'loading'],
    // El resto de etiquetas no lleva atributos: asi no pasa ningun `on*`.
  },
  // Solo esquemas de navegacion. Sin esto, `javascript:` sobreviviria dentro de href.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowedIframeHostnames: SERVIDORES_DE_VIDEO,
  // Un `src` relativo se saltaria la comprobacion de servidor: no hay ninguno valido.
  allowIframeRelativeUrls: false,
  // Los enlaces externos no deben poder manipular la pestana de origen.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    // Una imagen que no sea de la biblioteca se queda sin `src` y la descarta el filtro
    // de abajo. No se avisa de nada: quien escribe ve el hueco y lo entiende antes que
    // cualquier mensaje.
    img: (_etiqueta, atributos) => {
      const ruta = rutaDeMediaPublico(atributos.src)
      const attribs: Record<string, string> =
        ruta === null ? {} : { src: ruta, alt: atributos.alt ?? '', loading: 'lazy' }
      return { tagName: 'img', attribs }
    },
  },
  disallowedTagsMode: 'discard',
  // Un iframe o una imagen que pierden su `src` sobreviven como etiqueta vacia. No
  // hacen dano, pero dejan un hueco en la pagina que nadie pidio: se descartan enteros.
  exclusiveFilter: (marco) =>
    (marco.tag === 'iframe' || marco.tag === 'img') && marco.attribs.src === undefined,
}

/**
 * Como se reconoce la direccion de un video y en que se convierte.
 *
 * Se pide pegar la direccion de la barra del navegador, que es la que cualquiera tiene a
 * mano; la de incrustar hay que ir a buscarla a un menu. Quien la tenga tambien puede
 * pegar el `<iframe>` entero: la lista blanca de servidores lo deja pasar igual.
 *
 * YouTube va por `youtube-nocookie.com`: mismo reproductor, sin dejar rastro en quien
 * solo pasaba por la pagina.
 */
const VIDEOS: Array<{ patron: RegExp; incrustar: (id: string) => string }> = [
  {
    patron: /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})(?:&\S*)?$/,
    incrustar: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
  },
  {
    patron: /^https?:\/\/youtu\.be\/([\w-]{11})(?:\?\S*)?$/,
    incrustar: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
  },
  {
    patron: /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:[/?]\S*)?$/,
    incrustar: (id) => `https://player.vimeo.com/video/${id}`,
  },
]

/**
 * Una direccion de video sola en su linea se convierte en el reproductor.
 *
 * Sola en su linea a proposito: asi una direccion citada dentro de un parrafo, o dentro
 * de un enlace con texto, se queda como estaba. Quien escribe no tiene que aprender
 * ninguna sintaxis nueva; pega la direccion y ya.
 */
function incrustarVideos(markdown: string): string {
  return markdown
    .split('\n')
    .map((linea) => {
      const limpia = linea.trim()
      for (const { patron, incrustar } of VIDEOS) {
        const coincide = patron.exec(limpia)
        if (coincide !== null) {
          const src = incrustar(coincide[1] as string)
          // En bloque suelto: marked pasa el HTML tal cual y el saneado decide.
          return `\n<iframe src="${src}" title="Video" loading="lazy" allowfullscreen allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"></iframe>\n`
        }
      }
      return linea
    })
    .join('\n')
}

export function renderMarkdown(markdown: string | null | undefined): string | null {
  if (markdown === null || markdown === undefined || markdown.trim() === '') return null

  const html = marked.parse(incrustarVideos(markdown), { async: false })
  return sanitizeHtml(html, OPCIONES)
}
