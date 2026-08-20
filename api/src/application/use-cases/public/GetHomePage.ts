import type { PageContentRecord } from '../../ports/repositories/SiteContentRepository.js'
import type { SiteContentUseCases } from '../site/SiteContentUseCases.js'
import type { PostRecord } from '../../ports/repositories/PostRepository.js'
import type { PostUseCases } from '../posts/PostUseCases.js'
import type { GetPublicProfile, PublicProfile } from './GetPublicProfile.js'

/** Lo ultimo, no un listado: para eso estan News y Blog. */
const LIMITE_ENTRADAS = 3

export interface HomePage {
  profile: PublicProfile
  /** Vacio si el titular oculto los textos de la portada. */
  page: PageContentRecord | null
  /**
   * Lo ultimo de News, para el carrusel que cierra la portada.
   *
   * Vacio si la pagina de News esta apagada o si no hay nada publicado, que es la misma
   * condicion con la que se decide el menu del sitio. El blog se retiro de la portada:
   * tiene su propia pagina y en el menu.
   */
  latestNews: PostRecord[]
  postKindLabels: Record<string, string>
  /** Que bloques se pintan, ya resuelto: `hero`, `about`, `appointments`... */
  sections: Record<string, boolean>
}

/**
 * `GET /api/public/home` (ERS §30): el cuerpo de la portada en UNA llamada.
 *
 * La portada habla de la persona y no de su produccion, asi que aqui ya no viajan
 * publicaciones, cursos ni eventos: eso lo cuentan Research, Teaching y Events, cada una
 * en su pagina, y pedirlo eran cuatro consultas por visita que nadie llegaba a pintar.
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
    private readonly posts: PostUseCases,
  ) {}

  async execute(): Promise<HomePage> {
    const visibilidad = await this.siteContent.getVisibility()
    const seVe = (seccion: string) => visibilidad.sections[`home.${seccion}`] ?? true

    const [profile, page, news] = await Promise.all([
      this.profile.execute(),
      // `findPublishedPage`, no `getPage`: con `getPage` el interruptor "visible en la
      // web" de la portada no hacia nada, y sus textos se servian igual estando oculta.
      seVe('hero') || seVe('research_areas')
        ? this.siteContent.findPublishedPage('home')
        : Promise.resolve(null),
      // Solo su interruptor de banda: las noticias no tienen listado propio, asi que no
      // hay ninguna pagina que apagar de la que dependan.
      seVe('latest_news')
        ? this.posts.listPublished({ page: 1, page_size: LIMITE_ENTRADAS }, { kind: 'news' })
        : Promise.resolve({ items: [], kindLabels: {} }),
    ])

    return {
      profile,
      page,
      latestNews: news.items,
      postKindLabels: news.kindLabels,
      sections: Object.fromEntries(
        Object.entries(visibilidad.sections)
          .filter(([clave]) => clave.startsWith('home.'))
          .map(([clave, valor]) => [clave.slice('home.'.length), valor]),
      ),
    }
  }
}
