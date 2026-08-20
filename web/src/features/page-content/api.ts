import { get, patch } from '@/lib/api/client'

/**
 * Cliente de `/api/admin/page-content` y `/api/admin/page-sections`.
 *
 * Las páginas de la web son fijas: no se crean ni se borran, solo se editan y se
 * encienden o se apagan. Sus secciones, igual: las define el código y aquí solo se
 * decide cuáles se ven.
 */

export const PAGE_KEYS = [
  'home',
  'research',
  'teaching',
  'events',
  'news',
  'blog',
] as const
export type PageKey = (typeof PAGE_KEYS)[number]

export const NOMBRE_DE_PAGINA: Record<PageKey, string> = {
  home: 'Home',
  research: 'Research',
  teaching: 'Teaching',
  events: 'Events',
  news: 'News',
  blog: 'Blog',
}

export const QUE_MUESTRA: Record<PageKey, string> = {
  home: 'The home page, with your introduction.',
  research: 'The listing of your work.',
  teaching: 'The listing of your courses.',
  events: 'The agenda of seminars and conferences.',
  news: 'Short announcements: grants, awards, appointments.',
  blog: 'Longer writing, outside the academic record.',
}

/** La unica que no se puede ocultar. La API lo rechaza tambien. */
export const PAGINA_SIEMPRE_VISIBLE: PageKey = 'home'

/**
 * Las paginas que pintan la imagen que se elige aqui.
 *
 * Solo se ofrece el campo donde el sitio lo dibuja. Antes se ofrecia en todas y no se
 * pintaba en ninguna: se guardaba la imagen y no aparecia nunca. En Research y Teaching
 * va al lado del texto de la cabecera; en la portada, centrada en su propia banda. En
 * Eventos, News y Blog no se ofrece porque ninguna la dibuja.
 */
export const PAGINAS_CON_IMAGEN: readonly PageKey[] = [
  'home',
  'research',
  'teaching',
]

/**
 * Como se llama cada seccion en pantalla, y que es.
 *
 * Las claves las define el codigo. Una que no este aqui se muestra con su clave: es
 * preferible a esconderla, porque significaria que alguien anadio una seccion y se
 * olvido de nombrarla.
 */
export const NOMBRE_DE_SECCION: Record<
  string,
  {
    titulo: string
    que: string
    admiteFondo?: boolean
    /**
     * Si se puede reescribir el rotulo de la banda. Fuera quedan las que lo calculan
     * —«Upcoming events» pasa a «Past events» segun lo que haya publicado—, porque
     * escribirlo obligaria a decidir cual de los dos gana.
     */
    admiteTitulo?: boolean
  }
> = {
  'home.hero': {
    titulo: 'Introduction',
    que: 'Your name, your photo, your summary and the CV.',
    admiteFondo: true,
  },
  'home.image': {
    titulo: 'Image',
    que: 'A picture on its own band, centred. You choose it in the Image field of this page.',
    admiteFondo: false,
    admiteTitulo: true,
  },
  'home.latest_news': {
    titulo: 'Latest news',
    que: 'The three most recent news items, in a carousel that closes the page. It does not appear if News is switched off.',
    admiteFondo: true,
    admiteTitulo: true,
  },
  'research.header': {
    titulo: 'Header',
    que: 'The title and intro of this page.',
    admiteFondo: true,
  },
  'teaching.header': {
    titulo: 'Header',
    que: 'The title and intro of this page.',
    admiteFondo: true,
  },
  'teaching.filters': {
    titulo: 'Filters',
    que: 'The search, the institution and "running only".',
  },
  'events.header': {
    titulo: 'Header',
    que: 'The title and intro of this page.',
    admiteFondo: true,
  },
  'news.header': {
    titulo: 'Header',
    que: 'The title and intro of this page.',
    admiteFondo: true,
  },
  'blog.header': {
    titulo: 'Header',
    que: 'The title and intro of this page.',
    admiteFondo: true,
  },
}

export interface PageSection {
  id: string
  pageKey: PageKey
  sectionKey: string
  isVisible: boolean
  /** Rotulo de la banda. `null` significa el que trae la plantilla. */
  heading: string | null
  /** El texto pequeno a su derecha. `null` significa el de la plantilla. */
  headingAside: string | null
  /** Fondo de la banda. Sin imagen la seccion se pinta con su color liso. */
  backgroundMediaId: string | null
  /** Capa oscura sobre la imagen, de 0 a 100. */
  backgroundOverlay: number
  sortOrder: number
}

export interface PageContent {
  id: string
  pageKey: PageKey
  pageTitle: string | null
  eyebrow: string | null
  introMarkdown: string | null
  secondaryMarkdown: string | null
  heroMediaId: string | null
  heroAlt: string | null
  isPublished: boolean
}

export type PageContentInput = Partial<Omit<PageContent, 'id' | 'pageKey'>>

export function listPageContent(): Promise<PageContent[]> {
  return get<PageContent[]>('/api/admin/page-content')
}

export function updatePageContent(
  pageKey: PageKey,
  input: PageContentInput
): Promise<PageContent> {
  return patch<PageContent>(`/api/admin/page-content/${pageKey}`, input)
}

/** Las secciones de una pagina, en el orden en que se pintan. */
export function listPageSections(pageKey: PageKey): Promise<PageSection[]> {
  return get<PageSection[]>('/api/admin/page-sections', { page: pageKey })
}

/** No se crean ni se borran: solo se ajusta lo que se ve, su rotulo y su fondo. */
export function updatePageSection(
  id: string,
  cambio: {
    isVisible?: boolean
    heading?: string | null
    headingAside?: string | null
    backgroundMediaId?: string | null
    backgroundOverlay?: number
  }
): Promise<PageSection> {
  return patch<PageSection>(`/api/admin/page-sections/${id}`, cambio)
}
