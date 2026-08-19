/**
 * Convierte el contenido de la base actual en el seeder inicial.
 *
 * Se ejecuta a mano, no en el despliegue:
 *
 *   corepack pnpm exec tsx --env-file=../.env scripts/generar-seed-contenido.ts
 *
 * Escribe `src/infrastructure/database/seed/data/contenido.data.ts`, que es un fichero
 * **generado**: no se edita a mano. Para cambiar el contenido inicial se cambia el
 * contenido desde el panel y se vuelve a ejecutar esto.
 *
 * Lo que NO se lleva:
 *
 * - **Los identificadores.** El seeder crea filas nuevas con sus propios UUID y las
 *   relaciona por clave natural. Copiar los UUID ataria dos bases distintas a los
 *   mismos identificadores sin ninguna razon.
 * - **Los archivos subidos.** `media_assets` guarda una ruta en disco; el binario no
 *   cabe en un fichero de codigo. Hoy no hay ninguno.
 * - **La auditoria y las sesiones.** Son historia de esta instalacion, no contenido.
 * - **El administrador.** Sale de ADMIN_EMAIL / ADMIN_PASSWORD, como hasta ahora.
 */

import { writeFileSync } from 'node:fs'
import prettier from 'prettier'
import { prisma } from '../src/infrastructure/database/prisma/client.js'

const DESTINO = new URL(
  '../src/infrastructure/database/seed/data/contenido.data.ts',
  import.meta.url,
)

/** JSON con comillas simples y sin `null` explicito, para que pase Prettier y ESLint. */
function literal(valor: unknown, sangria = 0): string {
  const margen = '  '.repeat(sangria)
  const dentro = '  '.repeat(sangria + 1)

  if (valor === null) return 'null'
  if (valor instanceof Date) return `new Date('${valor.toISOString()}')`
  // `Decimal` de Prisma: se serializa como cadena para no perder precision al pasar
  // por un `number`, y Prisma la vuelve a aceptar tal cual.
  if (typeof valor === 'object' && valor !== null && 's' in valor && 'd' in valor && 'e' in valor) {
    return `'${String(valor)}'`
  }
  if (typeof valor === 'string')
    return `'${valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)

  if (Array.isArray(valor)) {
    if (valor.length === 0) return '[]'
    return `[\n${valor.map((v) => `${dentro}${literal(v, sangria + 1)}`).join(',\n')},\n${margen}]`
  }

  const entradas = Object.entries(valor as Record<string, unknown>).filter(
    ([, v]) => v !== undefined,
  )
  if (entradas.length === 0) return '{}'
  return `{\n${entradas
    .map(([k, v]) => `${dentro}${k}: ${literal(v, sangria + 1)}`)
    .join(',\n')},\n${margen}}`
}

async function main(): Promise<void> {
  // --- Catalogos que el contenido necesita y el seeder base no trae ----------
  const workTypes = await prisma.workType.findMany({
    where: { maxItemsHome: { not: null } },
    select: { code: true, maxItemsHome: true },
    orderBy: { code: 'asc' },
  })

  // Con desempate por codigo: dos estados pueden compartir `sortOrder`, y sin un
  // segundo criterio Postgres los devuelve en cualquier orden. El fichero cambiaba de
  // una regeneracion a otra sin que hubiera cambiado ningun dato.
  const academicStatuses = await prisma.academicStatus.findMany({
    select: { code: true, label: true, tone: true, sortOrder: true, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  })

  const tags = await prisma.tag.findMany({
    select: { name: true, slug: true, category: true, isActive: true },
    orderBy: { name: 'asc' },
  })

  // --- Personas -------------------------------------------------------------
  const personas = await prisma.person.findMany({
    orderBy: [{ isSiteOwner: 'desc' }, { fullName: 'asc' }],
    select: {
      fullName: true,
      givenName: true,
      familyName: true,
      preferredName: true,
      professionalTitle: true,
      currentPosition: true,
      publicEmail: true,
      phone: true,
      city: true,
      countryCode: true,
      shortBio: true,
      fullBioMarkdown: true,
      researchStatementMarkdown: true,
      orcid: true,
      googleScholarUrl: true,
      scopusUrl: true,
      ssrnUrl: true,
      repecUrl: true,
      websiteUrl: true,
      sortName: true,
      isSiteOwner: true,
      links: {
        orderBy: { sortOrder: 'asc' },
        select: {
          linkType: true,
          label: true,
          url: true,
          iconKey: true,
          isPublic: true,
          sortOrder: true,
        },
      },
    },
  })

  // --- Instituciones y departamentos ---------------------------------------
  const instituciones = await prisma.institution.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      name: true,
      shortName: true,
      slug: true,
      websiteUrl: true,
      countryCode: true,
      city: true,
      description: true,
      brandColor: true,
      sortOrder: true,
      isActive: true,
      departments: {
        orderBy: { sortOrder: 'asc' },
        select: {
          name: true,
          shortName: true,
          slug: true,
          websiteUrl: true,
          descriptionMarkdown: true,
          sortOrder: true,
          isActive: true,
        },
      },
    },
  })

  // --- Revistas -------------------------------------------------------------
  const venues = await prisma.venue.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      name: true,
      abbreviation: true,
      venueType: true,
      publisherName: true,
      issn: true,
      isbnPrefix: true,
      countryCode: true,
      websiteUrl: true,
      ranking: true,
      citeScore: true,
      notes: true,
      isActive: true,
      sortOrder: true,
    },
  })

  // --- Publicaciones --------------------------------------------------------
  const works = await prisma.work.findMany({
    orderBy: [{ publicationYear: 'desc' }, { title: 'asc' }, { slug: 'asc' }],
    select: {
      title: true,
      subtitle: true,
      slug: true,
      abstractMarkdown: true,
      descriptionMarkdown: true,
      editorialStatus: true,
      publicationDate: true,
      publicationYear: true,
      firstOnlineDate: true,
      venueName: true,
      publisherName: true,
      volume: true,
      issue: true,
      pages: true,
      articleNumber: true,
      doi: true,
      isbn: true,
      issn: true,
      languageCode: true,
      citationTextOverride: true,
      versionLabel: true,
      downloadCode: true,
      bibtexOverride: true,
      displayOrder: true,
      isOpenAccess: true,
      isFeatured: true,
      featuredOrder: true,
      isCarousel: true,
      carouselOrder: true,
      workType: { select: { code: true } },
      academicStatus: { select: { code: true } },
      venue: { select: { name: true } },
      authors: {
        orderBy: { authorOrder: 'asc' },
        select: {
          authorOrder: true,
          contributionRole: true,
          isCorresponding: true,
          person: { select: { fullName: true } },
        },
      },
      tags: { select: { tag: { select: { slug: true } } } },
      links: {
        orderBy: { sortOrder: 'asc' },
        select: { linkType: true, label: true, url: true, sortOrder: true, isPublic: true },
      },
      workCitations: {
        select: { content: true, style: { select: { code: true } } },
      },
    },
  })

  // --- Cursos ---------------------------------------------------------------
  const courses = await prisma.course.findMany({
    orderBy: { title: 'asc' },
    select: {
      title: true,
      shortTitle: true,
      slug: true,
      defaultCode: true,
      level: true,
      summary: true,
      descriptionMarkdown: true,
      externalUrl: true,
      displayOrder: true,
      editorialStatus: true,
      isFeatured: true,
      featuredOrder: true,
      tags: { select: { tag: { select: { slug: true } } } },
      offerings: {
        orderBy: { sortOrder: 'asc' },
        select: {
          name: true,
          courseCode: true,
          term: true,
          academicYear: true,
          startDate: true,
          endDate: true,
          teachingRole: true,
          summary: true,
          contentMarkdown: true,
          isActive: true,
          sortOrder: true,
          editorialStatus: true,
          institution: { select: { name: true } },
          department: { select: { name: true } },
          teachers: {
            orderBy: { sortOrder: 'asc' },
            select: { role: true, sortOrder: true, person: { select: { fullName: true } } },
          },
        },
      },
    },
  })

  // --- Trayectoria del titular ---------------------------------------------
  //
  // Se relacionan por nombre de institucion y de departamento, como todo lo demas.
  // Solo las del titular: las de un coautor no salen en ninguna pagina.
  const afiliaciones = await prisma.affiliation.findMany({
    where: { person: { isSiteOwner: true } },
    orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }, { title: 'asc' }],
    select: {
      title: true,
      affiliationType: true,
      startDate: true,
      endDate: true,
      isPrimary: true,
      isCurrent: true,
      descriptionMarkdown: true,
      sortOrder: true,
      institution: { select: { name: true } },
      department: { select: { name: true } },
    },
  })

  // --- Noticias y entradas de blog ------------------------------------------
  const posts = await prisma.post.findMany({
    orderBy: [{ kind: 'asc' }, { publishedAt: 'desc' }, { slug: 'asc' }],
    select: {
      kind: true,
      title: true,
      slug: true,
      summary: true,
      contentMarkdown: true,
      imageAlt: true,
      displayOrder: true,
      editorialStatus: true,
      // `publishedAt` si viaja, al reves que en el resto: es lo que ordena el listado y
      // lo que se lee bajo el titulo. Sin ella todas las entradas nacerian con la fecha
      // del despliegue y el archivo quedaria plano.
      publishedAt: true,
    },
  })

  // --- Eventos --------------------------------------------------------------
  const events = await prisma.event.findMany({
    orderBy: [{ startsAt: 'desc' }, { slug: 'asc' }],
    select: {
      title: true,
      slug: true,
      eventType: true,
      summary: true,
      contentMarkdown: true,
      startsAt: true,
      endsAt: true,
      location: true,
      organizer: true,
      imageAlt: true,
      buttonLabel: true,
      buttonUrl: true,
      buttonColor: true,
      isMain: true,
      sortOrder: true,
      editorialStatus: true,
      institutions: { select: { institution: { select: { name: true } } } },
    },
  })

  // --- Textos de las paginas, secciones y ajustes ---------------------------
  const pages = await prisma.pageContent.findMany({
    orderBy: { pageKey: 'asc' },
    select: {
      pageKey: true,
      pageTitle: true,
      eyebrow: true,
      introMarkdown: true,
      secondaryMarkdown: true,
      heroAlt: true,
      isPublished: true,
    },
  })

  const sections = await prisma.pageSection.findMany({
    orderBy: [{ pageKey: 'asc' }, { sortOrder: 'asc' }, { sectionKey: 'asc' }],
    select: {
      pageKey: true,
      sectionKey: true,
      isVisible: true,
      backgroundOverlay: true,
      sortOrder: true,
    },
  })

  // `publicBaseUrl` no se lleva: es propia de cada instalacion y la fija PUBLIC_BASE_URL
  // en `site-settings.seed`. El seeder de contenido ya la descartaba al escribir; no
  // seleccionarla evita que la direccion de la maquina de desarrollo aparezca siquiera
  // en un fichero versionado.
  const settings = await prisma.siteSettings.findFirst({
    select: {
      siteName: true,
      defaultLocale: true,
      timezone: true,
      contactEmail: true,
      metaTitleDefault: true,
      metaDescriptionDefault: true,
      footerText: true,
    },
  })

  const salida = `/**
 * Contenido inicial de la plataforma. **Fichero generado: no se edita a mano.**
 *
 * Lo produce \`scripts/generar-seed-contenido.ts\` leyendo la base. Para cambiarlo:
 * se edita el contenido desde el panel y se vuelve a generar.
 *
 * No lleva identificadores: todo se relaciona por clave natural —el titulo de un
 * trabajo, el nombre de una persona, el slug de una etiqueta— para que al sembrar en
 * una base nueva cada fila reciba su propio UUID.
 *
 * Tampoco lleva archivos subidos: \`media_assets\` guarda una ruta en disco y el binario
 * no cabe aqui. Las portadas, retratos y PDF se suben desde el panel despues.
 */

export const CONTENIDO = ${literal(
    {
      workTypes,
      academicStatuses,
      tags,
      personas,
      instituciones,
      venues,
      works,
      afiliaciones,
      courses,
      events,
      posts,
      pages,
      sections,
      settings,
    },
    0,
  )}
`

  // Se formatea con la configuracion del proyecto: si no, `pnpm format:check` fallaria
  // en cuanto alguien regenerase el fichero.
  const opciones = await prettier.resolveConfig(DESTINO.pathname)
  writeFileSync(
    DESTINO,
    await prettier.format(salida, { ...opciones, filepath: DESTINO.pathname }),
    'utf8',
  )

  const resumen = {
    tiposConLimite: workTypes.length,
    estados: academicStatuses.length,
    etiquetas: tags.length,
    personas: personas.length,
    instituciones: instituciones.length,
    revistas: venues.length,
    trabajos: works.length,
    afiliaciones: afiliaciones.length,
    cursos: courses.length,
    eventos: events.length,
    entradas: posts.length,
    paginas: pages.length,
    secciones: sections.length,
  }
  // eslint-disable-next-line no-console
  console.log(`Escrito ${DESTINO.pathname}\n`, resumen)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
