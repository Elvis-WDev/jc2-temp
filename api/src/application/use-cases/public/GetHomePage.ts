import type { PublicCourseSummary } from '../../ports/repositories/PublicCourseRepository.js'
import type { PublicWorkSummary } from '../../ports/repositories/PublicWorkRepository.js'
import type { PageContentRecord } from '../../ports/repositories/SiteContentRepository.js'
import type { SiteContentUseCases } from '../site/SiteContentUseCases.js'
import type { PublicResearchUseCases } from '../research/PublicResearchUseCases.js'
import type { PublicTeachingUseCases } from '../teaching/PublicTeachingUseCases.js'
import type { EventRecord } from '../../ports/repositories/EventRepository.js'
import type { PublicEventUseCases } from '../events/EventUseCases.js'
import type { GetPublicProfile, PublicProfile } from './GetPublicProfile.js'

/** Cuantos destacados entran en Home sin convertirla en un listado. */
const LIMITE_DESTACADOS = 6

/** El carrusel es para uno o dos trabajos, no para el archivo entero. */
const LIMITE_CARRUSEL = 5

/** Dos filas de tres. Para la agenda entera esta la pagina de Eventos. */
const LIMITE_EVENTOS = 6

export interface HomePage {
  profile: PublicProfile
  /** Vacio si el titular oculto los textos de la portada. */
  page: PageContentRecord | null
  /** Los que encabezan la portada. Seleccion aparte de los destacados. */
  carouselWorks: PublicWorkSummary[]
  featuredWorks: PublicWorkSummary[]
  featuredCourses: PublicCourseSummary[]
  /**
   * Los proximos; y si no hay ninguno por venir, los ultimos celebrados.
   *
   * Asi la seccion no se queda vacia mientras haya historia que ensenar, que es lo
   * habitual fuera de temporada.
   */
  events: EventRecord[]
  eventTypeLabels: Record<string, string>
  /** Que bloques se pintan, ya resuelto: `hero`, `carousel`, `featured_works`... */
  sections: Record<string, boolean>
}

/**
 * `GET /api/public/home` (ERS §30): el cuerpo de la portada en UNA llamada.
 *
 * El ERS es explicito: "No obligar al frontend a realizar cinco peticiones para
 * construir Home". Las consultas van en paralelo, asi que el coste es el de la mas
 * lenta y no la suma.
 *
 * Lo que NO esta aqui es la cabecera y el pie: eso lo sirve `/api/public/site`, porque
 * es igual en todas las paginas y las demas no van a pedir la portada para pintarlo.
 *
 * Los interruptores de seccion se respetan aqui: si el titular apaga una, ni siquiera
 * se consulta. Y apagar la pagina apaga lo que hay dentro, porque la visibilidad ya
 * llega resuelta.
 */
export class GetHomePage {
  constructor(
    private readonly profile: GetPublicProfile,
    private readonly siteContent: SiteContentUseCases,
    private readonly research: PublicResearchUseCases,
    private readonly teaching: PublicTeachingUseCases,
    private readonly events: PublicEventUseCases,
  ) {}

  async execute(): Promise<HomePage> {
    const visibilidad = await this.siteContent.getVisibility()
    const seVe = (seccion: string) => visibilidad.sections[`home.${seccion}`] ?? true

    const [profile, page, carouselWorks, featuredWorks, featuredCourses, proximos] =
      await Promise.all([
        this.profile.execute(),
        // `findPublishedPage`, no `getPage`: con `getPage` el interruptor "visible en la
        // web" de la portada no hacia nada, y sus textos se servian igual estando oculta.
        seVe('hero') ? this.siteContent.findPublishedPage('home') : Promise.resolve(null),
        seVe('carousel') ? this.research.listCarousel(LIMITE_CARRUSEL) : Promise.resolve([]),
        seVe('featured_works')
          ? this.research.listFeatured(LIMITE_DESTACADOS)
          : Promise.resolve([]),
        seVe('featured_courses')
          ? this.teaching.listFeatured(LIMITE_DESTACADOS)
          : Promise.resolve([]),
        seVe('events') ? this.eventosDePortada() : Promise.resolve({ items: [], typeLabels: {} }),
      ])

    return {
      profile,
      page,
      carouselWorks,
      featuredWorks,
      featuredCourses,
      events: proximos.items,
      eventTypeLabels: proximos.typeLabels,
      sections: Object.fromEntries(
        Object.entries(visibilidad.sections)
          .filter(([clave]) => clave.startsWith('home.'))
          .map(([clave, valor]) => [clave.slice('home.'.length), valor]),
      ),
    }
  }

  /**
   * Los proximos, y si no hay ninguno, los ultimos celebrados.
   *
   * La segunda consulta solo ocurre cuando la primera vuelve vacia: fuera de temporada
   * una seccion en blanco no dice nada, y la historia si.
   */
  private async eventosDePortada(): Promise<{
    items: EventRecord[]
    typeLabels: Record<string, string>
  }> {
    const proximos = await this.events.list(
      { page: 1, page_size: LIMITE_EVENTOS },
      { eventType: null, upcoming: true },
    )
    if (proximos.items.length > 0) return proximos

    return this.events.list(
      { page: 1, page_size: LIMITE_EVENTOS },
      { eventType: null, upcoming: false },
    )
  }
}
