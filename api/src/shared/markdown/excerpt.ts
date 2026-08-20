import sanitizeHtml from 'sanitize-html'

/**
 * El texto plano de un Markdown, recortado.
 *
 * En el servidor no hay DOM, asi que las etiquetas se quitan con el mismo saneador que
 * ya se usa para renderizar: pedirle que no permita ninguna etiqueta deja el texto
 * suelto, y de paso decodifica las entidades —`&amp;` vuelve a ser `&`— que un
 * reemplazo con expresiones regulares dejaria a medias.
 *
 * El corte busca el ultimo espacio antes del limite: partir una palabra por la mitad se
 * lee como un error de la pagina, no como un recorte. Si no hay ningun espacio —una
 * palabra larguisima, o un texto sin espacios— se corta en seco, que es mejor que
 * devolver algo mas largo de lo pedido.
 */
export function extractoDeMarkdown(markdown: string | null, limite: number): string | null {
  if (markdown === null) return null

  const texto = sanitizeHtml(markdown, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()

  if (texto === '') return null
  if (texto.length <= limite) return texto

  const cortado = texto.slice(0, limite - 1)
  const ultimoEspacio = cortado.lastIndexOf(' ')
  const base = ultimoEspacio > 0 ? cortado.slice(0, ultimoEspacio) : cortado

  return `${base.trimEnd()}…`
}
