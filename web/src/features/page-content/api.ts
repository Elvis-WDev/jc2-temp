import { get, patch } from '@/lib/api/client'

/**
 * Cliente de `/api/admin/page-content` y `/api/admin/page-sections`.
 *
 * Las páginas de la web son fijas: no se crean ni se borran, solo se editan y se
 * encienden o se apagan. Sus secciones, igual: las define el código y aquí solo se
 * decide cuáles se ven.
 */

export const PAGE_KEYS = ['home', 'research', 'teaching', 'events'] as const
export type PageKey = (typeof PAGE_KEYS)[number]

export const NOMBRE_DE_PAGINA: Record<PageKey, string> = {
  home: 'Home',
  research: 'Research',
  teaching: 'Teaching',
  events: 'Events',
}

export const QUE_MUESTRA: Record<PageKey, string> = {
  home: 'The home page, with your introduction.',
  research: 'The listing of your work.',
  teaching: 'The listing of your courses.',
  events: 'The agenda of seminars and conferences.',
}

/** La unica que no se puede ocultar. La API lo rechaza tambien. */
export const PAGINA_SIEMPRE_VISIBLE: PageKey = 'home'

/**
 * Como se llama cada seccion en pantalla, y que es.
 *
 * Las claves las define el codigo. Una que no este aqui se muestra con su clave: es
 * preferible a esconderla, porque significaria que alguien anadio una seccion y se
 * olvido de nombrarla.
 */
export const NOMBRE_DE_SECCION: Record<
  string,
  { titulo: string; que: string; admiteFondo?: boolean }
> = {
  'home.hero': {
    titulo: 'Introduction',
    que: 'Your name, your photo, your summary and the CV.',
    admiteFondo: true,
  },
  'home.carousel': {
    titulo: 'Carousel',
    que: 'The publications that head the home page.',
    admiteFondo: true,
  },
  'home.research_areas': {
    titulo: 'Research lines',
    que: 'The secondary text of this page, in several columns.',
    admiteFondo: true,
  },
  'home.featured_works': {
    titulo: 'Selected publications',
    que: 'The work you mark as featured.',
    admiteFondo: true,
  },
  'home.featured_courses': {
    titulo: 'Teaching',
    que: 'The courses you mark as featured.',
    admiteFondo: true,
  },
  'home.events': {
    titulo: 'Events',
    que: 'The grid of events at the end of the home page.',
    admiteFondo: true,
  },
  'research.header': {
    titulo: 'Header',
    que: 'The title and intro of this page.',
    admiteFondo: true,
  },
  'research.filters': {
    titulo: 'Filters',
    que: 'The sidebar with type, status, topic and year.',
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
}

export interface PageSection {
  id: string
  pageKey: PageKey
  sectionKey: string
  isVisible: boolean
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

/** No se crean ni se borran: solo se ajusta lo que se ve y con que fondo. */
export function updatePageSection(
  id: string,
  cambio: {
    isVisible?: boolean
    backgroundMediaId?: string | null
    backgroundOverlay?: number
  }
): Promise<PageSection> {
  return patch<PageSection>(`/api/admin/page-sections/${id}`, cambio)
}
