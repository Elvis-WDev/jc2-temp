import { doiToUrl } from './Doi.js'

/**
 * Generacion automatica de cita y BibTeX (RF-010).
 *
 * Si el administrador guardo un override, ese gana: los formatos de cita academicos
 * tienen casos que ninguna plantilla cubre bien, y quien escribe el CV necesita poder
 * imponer el suyo.
 */

export interface CitationAuthor {
  fullName: string
  givenName: string | null
  familyName: string | null
}

export interface CitationSource {
  title: string
  subtitle: string | null
  authors: CitationAuthor[]
  publicationYear: number | null
  venueName: string | null
  publisherName: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  doi: string | null
  isbn: string | null
  workTypeCode: string
  citationTextOverride: string | null
  bibtexOverride: string | null
}

/** "Carbajal, J. C." a partir de nombre y apellidos, con respaldo al nombre completo. */
function apellidoInicial(autor: CitationAuthor): string {
  if (autor.familyName === null || autor.familyName === '') return autor.fullName

  const iniciales = (autor.givenName ?? '')
    .split(/\s+/)
    .filter((parte) => parte !== '')
    .map((parte) => `${parte.charAt(0).toUpperCase()}.`)
    .join(' ')

  return iniciales === '' ? autor.familyName : `${autor.familyName}, ${iniciales}`
}

function listaDeAutores(autores: CitationAuthor[]): string {
  const nombres = autores.map(apellidoInicial)
  if (nombres.length === 0) return ''
  if (nombres.length === 1) return nombres[0] ?? ''
  return `${nombres.slice(0, -1).join(', ')}, & ${nombres[nombres.length - 1] ?? ''}`
}

function tituloCompleto(fuente: CitationSource): string {
  return fuente.subtitle === null || fuente.subtitle === ''
    ? fuente.title
    : `${fuente.title}: ${fuente.subtitle}`
}

export function buildCitationText(fuente: CitationSource): string {
  if (fuente.citationTextOverride !== null && fuente.citationTextOverride !== '') {
    return fuente.citationTextOverride
  }

  const partes: string[] = []

  const autores = listaDeAutores(fuente.authors)
  if (autores !== '') partes.push(autores)

  partes.push(`(${fuente.publicationYear?.toString() ?? 'n.d.'})`)
  partes.push(`${tituloCompleto(fuente)}.`)

  const sede = fuente.venueName ?? fuente.publisherName
  if (sede !== null && sede !== '') {
    let referencia = sede
    if (fuente.volume !== null && fuente.volume !== '') {
      referencia += `, ${fuente.volume}`
      if (fuente.issue !== null && fuente.issue !== '') referencia += `(${fuente.issue})`
    }
    if (fuente.pages !== null && fuente.pages !== '') referencia += `, ${fuente.pages}`
    partes.push(`${referencia}.`)
  }

  if (fuente.doi !== null && fuente.doi !== '') partes.push(doiToUrl(fuente.doi))

  return partes.join(' ')
}

/** Tipo de entrada BibTeX segun el tipo de trabajo (ERS §14). */
const TIPO_BIBTEX: Record<string, string> = {
  journal_article: 'article',
  book: 'book',
  book_chapter: 'incollection',
  conference_paper: 'inproceedings',
  thesis: 'phdthesis',
  working_paper: 'techreport',
  research_note: 'techreport',
  policy_report: 'techreport',
  work_in_progress: 'unpublished',
  dataset: 'misc',
  software: 'misc',
  other: 'misc',
}

/** Clave estable: apellido del primer autor + ano + primera palabra del titulo. */
function claveBibtex(fuente: CitationSource): string {
  const primero = fuente.authors[0]
  const apellido = (primero?.familyName ?? primero?.fullName ?? 'anon')
    .split(/\s+/)
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  const anio = fuente.publicationYear?.toString() ?? 'nd'
  const palabra = fuente.title
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  return [apellido, anio, palabra].filter((parte) => parte !== undefined && parte !== '').join('')
}

export function buildBibtex(fuente: CitationSource): string {
  if (fuente.bibtexOverride !== null && fuente.bibtexOverride !== '') {
    return fuente.bibtexOverride
  }

  const tipo = TIPO_BIBTEX[fuente.workTypeCode] ?? 'misc'
  const campos: Array<[string, string | null]> = [
    [
      'author',
      fuente.authors.length === 0
        ? null
        : fuente.authors
            .map((a) =>
              a.familyName !== null && a.familyName !== ''
                ? `${a.familyName}, ${a.givenName ?? ''}`.trim().replace(/,$/, '')
                : a.fullName,
            )
            .join(' and '),
    ],
    ['title', tituloCompleto(fuente)],
    [tipo === 'article' ? 'journal' : 'booktitle', fuente.venueName],
    ['publisher', fuente.publisherName],
    ['year', fuente.publicationYear?.toString() ?? null],
    ['volume', fuente.volume],
    ['number', fuente.issue],
    // BibTeX usa doble guion para el rango de paginas.
    ['pages', fuente.pages === null ? null : fuente.pages.replace(/\s*-\s*/, '--')],
    ['doi', fuente.doi],
    ['isbn', fuente.isbn],
  ]

  const lineas = campos
    .filter((campo): campo is [string, string] => campo[1] !== null && campo[1] !== '')
    .map(([clave, valor]) => `  ${clave} = {${valor}}`)

  return `@${tipo}{${claveBibtex(fuente)},\n${lineas.join(',\n')}\n}`
}
