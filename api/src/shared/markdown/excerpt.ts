import sanitizeHtml from 'sanitize-html'
import { renderMarkdown } from './render.js'

/**
 * Las cinco entidades que deja el conversor al escapar el texto.
 *
 * En una sola pasada a proposito: decodificarlas de una en una convertiria `&amp;lt;`
 * —que es como se escribe un `&lt;` literal— en `<`, dos escapes por el precio de uno.
 */
const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
}

/**
 * El texto plano de un Markdown, recortado.
 *
 * **Se convierte primero y se desnuda despues.** Quitarle las etiquetas al Markdown en
 * crudo dejaba pasar su sintaxis entera: la tarjeta de una publicacion ensenaba
 * `We show **strong** results, see [the appendix](https://...) and \`theta_i\`.
 * ## Second heading - first bullet`. El campo dice «Markdown works here» y desde que
 * tiene barra de botones se escribe asi sin pensarlo, asi que el extracto tiene que
 * saber leerlo.
 *
 * Convierte con `renderMarkdown`, el mismo de la web, y no con `marked` a secas: asi una
 * direccion de video suelta en su linea se vuelve un reproductor y desaparece del
 * extracto, en lugar de quedarse como una URL larga en medio de la frase.
 *
 * Y decodifica las cinco entidades XML que deja el conversor. Antes no lo hacia —el
 * comentario de aqui decia que si— y un resumen sobre «Auctions A & B con x > y» salia
 * como «Auctions A &amp;amp; B con x &amp;gt; y».
 *
 * El corte busca el ultimo espacio antes del limite: partir una palabra por la mitad se
 * lee como un error de la pagina, no como un recorte. Si no hay ningun espacio —una
 * palabra larguisima, o un texto sin espacios— se corta en seco, que es mejor que
 * devolver algo mas largo de lo pedido.
 */
export function extractoDeMarkdown(markdown: string | null, limite: number): string | null {
  if (markdown === null) return null

  const html = renderMarkdown(markdown)
  if (html === null) return null

  const texto = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&(amp|lt|gt|quot|#39);/g, (entera, nombre: string) => ENTIDADES[nombre] ?? entera)
    .replace(/\s+/g, ' ')
    .trim()

  if (texto === '') return null
  if (texto.length <= limite) return texto

  const cortado = texto.slice(0, limite - 1)
  const ultimoEspacio = cortado.lastIndexOf(' ')
  const base = ultimoEspacio > 0 ? cortado.slice(0, ultimoEspacio) : cortado

  return `${base.trimEnd()}…`
}
