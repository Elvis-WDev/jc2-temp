import { SECCIONES } from '../../../domain/site/PageRules.js'
import { prisma } from '../prisma/client.js'

/**
 * Contenido de las paginas y sus secciones (ERS §25, seed obligatorio).
 *
 * Sin estas filas, las paginas no tendrian textos editables y el frontend acabaria con
 * contenido hardcodeado, que es justo lo que prohibe ERS §2.2.
 *
 * Las secciones se siembran igual: el codigo las define, y estas filas guardan si se
 * ven. Una seccion sin fila se considera visible, asi que sembrarlas es una comodidad
 * para que aparezcan en el panel, no un requisito para que la web funcione.
 */
const PAGES = [
  {
    pageKey: 'home',
    pageTitle: 'Home',
    introMarkdown: null,
  },
  {
    pageKey: 'research',
    pageTitle: 'Research',
    introMarkdown: null,
  },
  {
    pageKey: 'teaching',
    pageTitle: 'Teaching',
    introMarkdown: null,
  },
  {
    pageKey: 'events',
    pageTitle: 'Events',
    introMarkdown: null,
  },
  {
    pageKey: 'news',
    pageTitle: 'News',
    introMarkdown: null,
  },
  {
    pageKey: 'blog',
    pageTitle: 'Blog',
    introMarkdown: null,
  },
] as const

export async function seedPageContent(): Promise<number> {
  for (const page of PAGES) {
    await prisma.pageContent.upsert({
      where: { pageKey: page.pageKey },
      // Vacio a proposito: nunca se sobrescribe texto que el administrador ya edito.
      update: {},
      create: {
        pageKey: page.pageKey,
        pageTitle: page.pageTitle,
        introMarkdown: page.introMarkdown,
        isPublished: true,
      },
    })

    for (const [indice, sectionKey] of (SECCIONES[page.pageKey] ?? []).entries()) {
      await prisma.pageSection.upsert({
        where: { pageKey_sectionKey: { pageKey: page.pageKey, sectionKey } },
        // El orden se reafirma; la visibilidad no, que el titular pudo apagarla.
        update: { sortOrder: indice },
        create: { pageKey: page.pageKey, sectionKey, sortOrder: indice, isVisible: true },
      })
    }
  }
  return PAGES.length
}
