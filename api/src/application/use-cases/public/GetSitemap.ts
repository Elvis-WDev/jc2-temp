import type { SiteContentUseCases } from '../site/SiteContentUseCases.js'
import type { PublicEventUseCases } from '../events/EventUseCases.js'
import type { PublicResearchUseCases } from '../research/PublicResearchUseCases.js'
import type { PublicTeachingUseCases } from '../teaching/PublicTeachingUseCases.js'

/**
 * Las direcciones publicas del sitio, para el sitemap (ERS §39).
 *
 * Se genera de lo que hay publicado, no de una lista escrita a mano: publicar un
 * trabajo lo mete en el sitemap sin que nadie tenga que acordarse, y archivarlo lo
 * saca. Es la misma idea que el resto del sitio.
 *
 * No se pagina: un sitemap tiene que ser completo o no sirve. El limite del formato son
 * 50.000 direcciones; una carrera academica no llega.
 */
const TODAS = { page: 1, page_size: 5000 } as const

export interface SitemapEntry {
  /** Ruta desde la raiz del sitio, con la barra inicial. */
  path: string
  /** Cuanto importa dentro del propio sitio, de 0 a 1. */
  priority: string
}

export class GetSitemap {
  constructor(
    private readonly research: PublicResearchUseCases,
    private readonly teaching: PublicTeachingUseCases,
    private readonly events: PublicEventUseCases,
    private readonly siteContent: SiteContentUseCases,
  ) {}

  async execute(): Promise<SitemapEntry[]> {
    const [visibilidad, trabajos, cursos, eventos] = await Promise.all([
      this.siteContent.getVisibility(),
      this.research.list(TODAS, {
        q: null,
        type: null,
        status: null,
        yearFrom: null,
        yearTo: null,
        tag: null,
        sort: 'newest',
      }),
      this.teaching.list(TODAS, {
        q: null,
        institution: null,
        department: null,
        activeOnly: false,
        tag: null,
        sort: 'newest',
      }),
      this.events.list(TODAS, { eventType: null, upcoming: null }),
    ])

    const seVe = (pagina: string) => visibilidad.pages[pagina] ?? true

    // La portada nunca se oculta; el resto solo se anuncia si esta visible.
    const entradas: SitemapEntry[] = [{ path: '/', priority: '1.0' }]

    if (seVe('research')) entradas.push({ path: '/research', priority: '0.9' })
    if (seVe('teaching')) entradas.push({ path: '/teaching', priority: '0.9' })
    // Eventos ademas necesita tener algo, igual que en el menu.
    if (seVe('events') && eventos.items.length > 0) {
      entradas.push({ path: '/events', priority: '0.7' })
    }

    // Las fichas se quedan aunque su indice este oculto: siguen siendo contenido valido
    // y sus enlaces siguen vivos, que es lo que se decidio.
    for (const trabajo of trabajos.items) {
      entradas.push({ path: `/research/${trabajo.slug}`, priority: '0.8' })
    }
    for (const curso of cursos.items) {
      entradas.push({ path: `/teaching/${curso.slug}`, priority: '0.6' })
    }
    for (const evento of eventos.items) {
      entradas.push({ path: `/events/${evento.slug}`, priority: '0.5' })
    }

    return entradas
  }
}
