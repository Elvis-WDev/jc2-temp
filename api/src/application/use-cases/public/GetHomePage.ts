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
   * Lo ultimo de News y de Blog, cada uno por su lado.
   *
   * Separados y no mezclados en una sola lista: son dos cosas distintas y cada grupo
   * lleva a su pagina. Un grupo llega vacio si su pagina esta apagada o si no hay nada
   * publicado, que es la misma condicion con la que se decide el menu del sitio.
   */
  latestPosts: { news: PostRecord[]; blog: PostRecord[] }
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

    // Apagar la pagina apaga lo suyo tambien en la portada: enlazar desde aqui a una
    // seccion que el menu no ensena llevaria a un 404.
    const seVePagina = (pagina: string) => visibilidad.pages[pagina] ?? true
    // Una banda por tipo, con su propio interruptor: son dos bloques distintos en la
    // pagina, y un interruptor compartido obligaria a apagar los dos para apagar uno.
    const ultimas = (tipo: string, pagina: string) =>
      seVe(`latest_${pagina}`) && seVePagina(pagina)
        ? this.posts.listPublished({ page: 1, page_size: LIMITE_ENTRADAS }, { kind: tipo })
        : Promise.resolve({ items: [], kindLabels: {} })

    const [profile, page, news, blog] = await Promise.all([
      this.profile.execute(),
      // `findPublishedPage`, no `getPage`: con `getPage` el interruptor "visible en la
      // web" de la portada no hacia nada, y sus textos se servian igual estando oculta.
      seVe('hero') || seVe('about') || seVe('research_areas')
        ? this.siteContent.findPublishedPage('home')
        : Promise.resolve(null),
      ultimas('news', 'news'),
      ultimas('personal', 'blog'),
    ])

    return {
      profile,
      page,
      latestPosts: { news: news.items, blog: blog.items },
      postKindLabels: { ...news.kindLabels, ...blog.kindLabels },
      sections: Object.fromEntries(
        Object.entries(visibilidad.sections)
          .filter(([clave]) => clave.startsWith('home.'))
          .map(([clave, valor]) => [clave.slice('home.'.length), valor]),
      ),
    }
  }
}
