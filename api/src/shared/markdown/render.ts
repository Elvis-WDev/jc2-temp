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

const OPCIONES: sanitizeHtml.IOptions = {
  allowedTags: ETIQUETAS_PERMITIDAS,
  allowedAttributes: {
    // `rel` y `target` los anade transformTags; si no estuvieran permitidos aqui,
    // se eliminarian justo despues de anadirlos.
    a: ['href', 'title', 'rel', 'target'],
    // El resto de etiquetas no lleva atributos: asi no pasa ningun `on*`.
  },
  // Solo esquemas de navegacion. Sin esto, `javascript:` sobreviviria dentro de href.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  // Los enlaces externos no deben poder manipular la pestana de origen.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
  disallowedTagsMode: 'discard',
}

export function renderMarkdown(markdown: string | null | undefined): string | null {
  if (markdown === null || markdown === undefined || markdown.trim() === '') return null

  const html = marked.parse(markdown, { async: false })
  return sanitizeHtml(html, OPCIONES)
}
