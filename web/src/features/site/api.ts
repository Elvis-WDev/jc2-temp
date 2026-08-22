import { ApiError } from '@/lib/api/api-error'
import { get, getWithMeta, type Pagination } from '@/lib/api/client'

/**
 * Cliente de la API publica (`/api/public`).
 *
 * Separado del cliente del panel a proposito. Lo que llega por aqui ya pasó por
 * RN-001 —solo contenido publicado— y por la lista blanca de los presenters, así que
 * estos tipos son deliberadamente mas pobres que los del panel: no traen estado
 * editorial, ni identificadores de archivo, ni orden interno. Si alguna vez aparece
 * aqui un campo de esos, es que se escapó por el backend.
 */

export interface PublicProfile {
  fullName: string
  preferredName: string | null
  professionalTitle: string | null
  currentPosition: string | null
  shortBio: string | null
  fullBioHtml: string | null
  researchStatementHtml: string | null
  publicEmail: string | null
  city: string | null
  countryCode: string | null
  photoUrl: string | null
  cvUrl: string | null
  orcid: string | null
  scholarUrls: {
    googleScholar: string | null
    scopus: string | null
    ssrn: string | null
    repec: string | null
    website: string | null
  }
  primaryAffiliation: {
    title: string
    institution: string
    department: string | null
  } | null
  /**
   * La trayectoria, de lo vigente a lo mas antiguo. Ya viene ordenada del servidor.
   *
   * `isCurrent` viaja aparte de las fechas porque es lo que decide si se escribe
   * «2019 — presente» o un rango cerrado: un cargo puede seguir vigente sin que nadie
   * sepa cuando acabara, asi que una fecha de fin vacia no significa lo mismo.
   */
  affiliations: Array<{
    title: string
    institution: string
    department: string | null
    type: string | null
    startDate: string | null
    endDate: string | null
    isCurrent: boolean
  }>
  links: Array<{
    type: string
    label: string | null
    url: string
    /**
     * El logotipo del servicio, subido desde el panel.
     *
     * `null` cuando no se ha elegido ninguno: entonces el enlace se ensena con su
     * rotulo, que es lo que hace el pie desde siempre.
     */
    iconUrl: string | null
  }>
}

export interface PublicPageContent {
  pageKey: string
  pageTitle: string | null
  eyebrow: string | null
  /** HTML ya saneado en el servidor (ERS §37): aqui no se vuelve a sanear. */
  introHtml: string | null
  secondaryHtml: string | null
  heroUrl: string | null
  heroAlt: string | null
}

export interface PublicWorkSummary {
  id: string
  slug: string
  title: string
  subtitle: string | null
  /** `pluralLabel` es el rotulo del grupo cuando el listado se agrupa por tipo. */
  type: { code: string; label: string; pluralLabel: string }
  academicStatus: string
  academicStatusLabel: string
  year: number | null
  venue: string | null
  venueAbbreviation: string | null
  venueRanking: string | null
  /** Del articulo, no de la revista: cambian en cada uno. */
  volume: string | null
  issue: string | null
  doi: string | null
  doiUrl: string | null
  isOpenAccess: boolean
  authors: string[]
  tags: Array<{ slug: string; name: string }>
  pdfUrl: string | null
  /**
   * Unas cinco lineas del abstract, en texto plano y ya recortadas por el servidor.
   *
   * Viaja en el listado porque la tarjeta lo ensena fijo: pedirlo por tarjeta seria una
   * peticion por publicacion. `null` cuando no hay abstract publicado.
   */
  abstractExcerpt: string | null
}

/**
 * Ficha completa de un trabajo.
 *
 * Se pide al desplegar el resumen de una tarjeta o al entrar en su pagina. No comparte
 * forma con el resumen a proposito: el resumen lleva los autores como texto ya
 * compuesto y la ficha los lleva uno a uno, con su papel y su orden.
 */
export interface PublicWorkDetail {
  id: string
  slug: string
  title: string
  subtitle: string | null
  type: { code: string; label: string }
  academicStatus: string
  academicStatusLabel: string
  abstractHtml: string | null
  descriptionHtml: string | null
  year: number | null
  publicationDate: string | null
  firstOnlineDate: string | null
  venue: string | null
  venueAbbreviation: string | null
  venueRanking: string | null
  publisher: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  articleNumber: string | null
  doi: string | null
  doiUrl: string | null
  isbn: string | null
  issn: string | null
  language: string | null
  isOpenAccess: boolean
  coverUrl: string | null
  authors: Array<{
    name: string
    order: number
    role: string | null
    isCorresponding: boolean
  }>
  tags: Array<{ slug: string; name: string }>
  links: Array<{ type: string; label: string | null; url: string }>
  /** Sin las figuras: esas van aparte, para poder mostrarlas juntas como galeria. */
  files: Array<{
    type: string
    label: string | null
    version: string | null
    url: string
  }>
  figures: Array<{ label: string | null; url: string }>
  version: string | null
  /** Codigo informativo para descargar el documento en un sitio externo. */
  downloadCode: string | null
  citation: string | null
  bibtex: string | null
}

export interface ResearchFacets {
  types: Array<{ code: string; label: string; count: number }>
  statuses: Array<{ value: string; label: string; count: number }>
  years: Array<{ year: number; count: number }>
  tags: Array<{ slug: string; name: string; count: number }>
}

export interface ResearchQuery {
  q?: string
  type?: string
  status?: string
  tag?: string
  year_from?: number
  year_to?: number
  sort?: 'newest' | 'oldest' | 'title' | 'relevance' | 'type'
  page?: number
}

export interface PublicCourseSummary {
  id: string
  slug: string
  title: string
  shortTitle: string | null
  level: string | null
  /** El de la edicion vigente si lo tiene, y si no el habitual del curso. */
  code: string | null
  summary: string | null
  tags: Array<{ slug: string; name: string }>
  currentOffering: {
    institution: string
    department: string | null
    term: string | null
    academicYear: number | null
    teachingRole: string | null
    isActive: boolean
  } | null
  offeringCount: number
}

export interface PublicHome {
  profile: PublicProfile
  /** Vacia si el titular oculto los textos de la portada. */
  page: PublicPageContent | null
  /**
   * Lo ultimo de News, para el carrusel que cierra la portada.
   *
   * Vacio si la pagina de News esta apagada o si no hay nada publicado, que es la misma
   * condicion con la que se decide el menu del sitio.
   */
  latestNews: PublicPost[]
  /** Que bloques se pintan, ya resueltos: `hero`, `about`, `appointments`... */
  sections: Record<string, boolean>
}

/**
 * Lo que es igual en todas las paginas: cabecera, pie e interruptores.
 *
 * Va aparte de la portada a proposito. Cuando esto vivia dentro de `/api/public/home`,
 * cualquier otra pagina tenia que pedir la portada entera solo para pintar su pie.
 */
export interface PublicSite {
  siteName: string
  /** Con que reloj se escriben las fechas del sitio. Sale de los ajustes. */
  timezone: string
  footerText: string | null
  contactEmail: string | null
  logoUrl: string | null
  /** Imagen de la primera columna del pie. */
  footerImageUrl: string | null
  meta: {
    title: string | null
    description: string | null
    ogImageUrl: string | null
  }
  /**
   * Que paginas se ven. Con esto se construye el menu.
   *
   * Eventos y blog ademas necesitan tener algo publicado: un menu que lleva a una
   * pagina vacia estorba tanto como uno que lleva a una pagina oculta.
   *
   * Noticias no aparece: no tiene listado propio. Vive en el carrusel de la portada.
   */
  pages: {
    research: boolean
    teaching: boolean
    events: boolean
    blog: boolean
  }
  /** Que bloques se pintan: `research.filters`, `home.hero`... */
  sections: Record<string, boolean>
  /**
   * El fondo de las secciones que tienen uno, con la misma clave que `sections`.
   * Las que no aparecen aqui se pintan con su color liso.
   */
  sectionBackgrounds: Record<string, { url: string; overlay: number }>
  /**
   * El rotulo de las secciones donde el titular escribio uno. Las que no aparecen
   * usan el de la plantilla.
   */
  sectionHeadings: Record<
    string,
    { title: string | null; aside: string | null }
  >
  owner: {
    fullName: string
    publicEmail: string | null
    orcid: string | null
    cvUrl: string | null
    scholarUrls: PublicProfile['scholarUrls']
    links: PublicProfile['links']
  }
}

/** El cuerpo de la portada, en una sola peticion (ERS §30, PERF-003). */
export function getHome(): Promise<PublicHome> {
  return get<PublicHome>('/api/public/home')
}

export function getSite(): Promise<PublicSite> {
  return get<PublicSite>('/api/public/site')
}

/**
 * Listado publico de trabajos.
 *
 * Los filtros se resuelven en el servidor (PERF-001) y las facetas vienen calculadas
 * sobre el mismo conjunto filtrado, asi que sus recuentos cuadran con la lista.
 */
export function listResearch(query: ResearchQuery): Promise<{
  items: PublicWorkSummary[]
  pagination: Pagination
  facets: ResearchFacets
}> {
  return getWithMeta<
    PublicWorkSummary[],
    { pagination: Pagination; facets: ResearchFacets }
  >('/api/public/research', query).then((respuesta) => ({
    items: respuesta.data,
    pagination: respuesta.meta.pagination,
    facets: respuesta.meta.facets,
  }))
}

export function getWork(idOrSlug: string): Promise<PublicWorkDetail> {
  return get<PublicWorkDetail>(`/api/public/research/${idOrSlug}`)
}

/**
 * Textos de una pagina (`home`, `research`, `teaching`, `events`).
 *
 * Devuelve vacio si el titular la oculto. Un 404 aqui no es un fallo que haya que
 * ensenar: significa "sin cabecera", y la lista de debajo se pinta igual.
 */
export async function getPageContent(
  pageKey: string
): Promise<PublicPageContent | null> {
  try {
    return await get<PublicPageContent>(`/api/public/pages/${pageKey}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Una edicion del curso, con sus docentes y sus materiales publicos. */
export interface PublicCourseOffering {
  id: string
  name: string | null
  institution: string
  department: string | null
  code: string | null
  term: string | null
  academicYear: number | null
  startDate: string | null
  endDate: string | null
  role: string | null
  teachers: Array<{ name: string; role: string | null }>
  isActive: boolean
  summary: string | null
  contentHtml: string | null
  materials: Array<{
    type: string
    typeLabel: string
    title: string
    description: string | null
    url: string | null
    isExternal: boolean
  }>
}

export interface PublicCourseDetail {
  id: string
  slug: string
  title: string
  shortTitle: string | null
  code: string | null
  externalUrl: string | null
  level: string | null
  summary: string | null
  descriptionHtml: string | null
  coverUrl: string | null
  tags: Array<{ slug: string; name: string }>
  offerings: PublicCourseOffering[]
}

export interface TeachingFacets {
  /** Con esto se agrupa la pagina: etiqueta, orden y entradilla salen del catalogo. */
  levels: Array<{
    code: string
    label: string
    description: string | null
    sortOrder: number
    count: number
  }>
  institutions: Array<{ slug: string; name: string; count: number }>
  departments: Array<{
    id: string
    name: string
    institution: string
    count: number
  }>
  tags: Array<{ slug: string; name: string; count: number }>
}

export interface TeachingQuery {
  q?: string
  institution?: string
  department?: string
  tag?: string
  active?: boolean
  sort?: 'newest' | 'title'
  page?: number
  page_size?: number
}

export function listTeaching(query: TeachingQuery): Promise<{
  items: PublicCourseSummary[]
  pagination: Pagination
  facets: TeachingFacets
}> {
  return getWithMeta<
    PublicCourseSummary[],
    { pagination: Pagination; facets: TeachingFacets }
  >('/api/public/teaching', query).then((respuesta) => ({
    items: respuesta.data,
    pagination: respuesta.meta.pagination,
    facets: respuesta.meta.facets,
  }))
}

export function getCourse(idOrSlug: string): Promise<PublicCourseDetail> {
  return get<PublicCourseDetail>(`/api/public/teaching/${idOrSlug}`)
}

export interface PublicEvent {
  id: string
  slug: string
  title: string
  type: string | null
  /** El nombre del catalogo, no el codigo interno. */
  typeLabel: string | null
  summary: string | null
  contentHtml: string | null
  startsAt: string
  endsAt: string | null
  location: string | null
  organizer: string | null
  imageUrl: string | null
  imageAlt: string | null
  button: { label: string | null; url: string; color: string | null } | null
  isMain: boolean
  institutions: string[]
}

export interface EventsQuery {
  type?: string
  upcoming?: boolean
  page?: number
  page_size?: number
}

export function listEvents(
  query: EventsQuery
): Promise<{ items: PublicEvent[]; pagination: Pagination }> {
  return getWithMeta<PublicEvent[], { pagination: Pagination }>(
    '/api/public/events',
    query
  ).then((respuesta) => ({
    items: respuesta.data,
    pagination: respuesta.meta.pagination,
  }))
}

export function getEvent(idOrSlug: string): Promise<PublicEvent> {
  return get<PublicEvent>(`/api/public/events/${idOrSlug}`)
}

/**
 * Una noticia o una entrada de blog.
 *
 * Las dos comparten forma porque comparten tabla: lo que cambia es cuanto se rellena.
 * Una noticia trae titulo, resumen e imagen; una entrada de blog trae ademas el cuerpo
 * y sus adjuntos. Aqui no viene el estado editorial ni el orden interno: lo que llega
 * ya paso por RN-001 y por la lista blanca del presenter.
 */
export interface PublicPost {
  id: string
  slug: string
  kind: string
  /** El nombre del catalogo, no el codigo interno. */
  kindLabel: string
  title: string
  summary: string | null
  /** HTML ya saneado en el servidor (ERS §37): aqui no se vuelve a sanear. */
  contentHtml: string | null
  imageUrl: string | null
  imageAlt: string | null
  publishedAt: string | null
  /** Solo los descargables: los privados no se nombran siquiera. */
  files: Array<{
    label: string | null
    url: string
    /** El tipo real. Lo que se puede escuchar se reproduce; el resto se descarga. */
    mimeType: string
  }>
}

export interface PostsQuery {
  kind?: string
  page?: number
  page_size?: number
}

export function listPosts(
  query: PostsQuery
): Promise<{ items: PublicPost[]; pagination: Pagination }> {
  return getWithMeta<PublicPost[], { pagination: Pagination }>(
    '/api/public/posts',
    query
  ).then((respuesta) => ({
    items: respuesta.data,
    pagination: respuesta.meta.pagination,
  }))
}

export function getPost(idOrSlug: string): Promise<PublicPost> {
  return get<PublicPost>(`/api/public/posts/${idOrSlug}`)
}
