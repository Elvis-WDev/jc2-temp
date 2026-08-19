import type { EditorialStatus } from '../prisma/generated/client.js'
import { prisma } from '../prisma/client.js'
import { CONTENIDO } from './data/contenido.data.js'

/**
 * Contenido inicial: publicaciones, personas, trayectoria, cursos, eventos, noticias,
 * entradas de blog y los textos del sitio.
 *
 * **Solo siembra una base vacia.** Si ya hay algun trabajo, no toca nada y devuelve
 * `skipped`. Es lo que separa un seeder inicial de uno que pisa el trabajo del titular:
 * si borro una publicacion, el siguiente despliegue no debe resucitarla.
 *
 * Los catalogos y los textos de pagina son otra cosa: los siembran `catalog-terms.seed`
 * y `page-content.seed`, que si son idempotentes fila a fila porque describen la
 * estructura de la plataforma, no su contenido.
 *
 * Todo se relaciona por clave natural —el nombre de una persona, el slug de una
 * etiqueta— porque el fichero de datos no lleva identificadores: cada instalacion
 * genera los suyos.
 */
export async function seedContenidoInicial(): Promise<'seeded' | 'skipped' | 'no-data'> {
  if (CONTENIDO.works.length === 0) return 'no-data'

  const yaHayContenido = await prisma.work.count()
  if (yaHayContenido > 0) return 'skipped'

  // Una sola transaccion: o entra el contenido entero o no entra nada. A medias
  // dejaria un sitio con trabajos sin autor, que es justo lo que RN-002 impide.
  await prisma.$transaction(
    async (tx) => {
      // --- Catalogos que este contenido necesita ----------------------------
      for (const tipo of CONTENIDO.workTypes) {
        await tx.workType.updateMany({
          where: { code: tipo.code },
          data: { maxItemsHome: tipo.maxItemsHome },
        })
      }

      for (const [indice, estado] of CONTENIDO.academicStatuses.entries()) {
        await tx.academicStatus.upsert({
          where: { code: estado.code },
          update: {},
          create: {
            code: estado.code,
            label: estado.label,
            tone: estado.tone,
            sortOrder: estado.sortOrder ?? indice,
            isActive: estado.isActive,
          },
        })
      }

      for (const tag of CONTENIDO.tags) {
        await tx.tag.upsert({
          where: { slug: tag.slug },
          update: {},
          create: {
            name: tag.name,
            slug: tag.slug,
            category: tag.category,
            isActive: tag.isActive,
          },
        })
      }

      // --- Personas y sus enlaces -------------------------------------------
      //
      // El titular ya existe: `site-settings.seed` crea uno de relleno ("Site Owner")
      // porque la configuracion del sitio no puede quedarse sin propietario, y un
      // indice unico impide que haya dos. Al titular se le rellenan los datos; a los
      // demas se les crea.
      const personaPorNombre = new Map<string, string>()
      for (const persona of CONTENIDO.personas) {
        const { links, ...datos } = persona

        const id = datos.isSiteOwner
          ? (
              await tx.person.update({
                where: {
                  id: (
                    await tx.person.findFirstOrThrow({
                      where: { isSiteOwner: true },
                      select: { id: true },
                    })
                  ).id,
                },
                data: datos,
              })
            ).id
          : (await tx.person.create({ data: datos })).id

        personaPorNombre.set(persona.fullName, id)

        for (const enlace of links) {
          await tx.personLink.create({ data: { personId: id, ...enlace } })
        }
      }

      // --- Instituciones y departamentos ------------------------------------
      const institucionPorNombre = new Map<string, string>()
      const departamentoPorNombre = new Map<string, string>()
      for (const institucion of CONTENIDO.instituciones) {
        const { departments, ...datos } = institucion
        const creada = await tx.institution.create({ data: datos })
        institucionPorNombre.set(institucion.name, creada.id)

        for (const depto of departments) {
          const creado = await tx.department.create({
            data: { institutionId: creada.id, ...depto },
          })
          departamentoPorNombre.set(depto.name, creado.id)
        }
      }

      // --- Revistas ----------------------------------------------------------
      const revistaPorNombre = new Map<string, string>()
      for (const venue of CONTENIDO.venues) {
        const creada = await tx.venue.create({ data: venue })
        revistaPorNombre.set(venue.name, creada.id)
      }

      // --- Publicaciones -----------------------------------------------------
      const tipos = await tx.workType.findMany({ select: { id: true, code: true } })
      const tipoPorCodigo = new Map(tipos.map((t) => [t.code, t.id]))

      const etiquetas = await tx.tag.findMany({ select: { id: true, slug: true } })
      const etiquetaPorSlug = new Map(etiquetas.map((t) => [t.slug, t.id]))

      const estilos = await tx.citationStyle.findMany({ select: { id: true, code: true } })
      const estiloPorCodigo = new Map(estilos.map((e) => [e.code, e.id]))

      const estados = await tx.academicStatus.findMany({ select: { id: true, code: true } })
      const estadoPorCodigo = new Map(estados.map((e) => [e.code, e.id]))

      for (const work of CONTENIDO.works) {
        const { workType, academicStatus, venue, authors, tags, links, workCitations, ...datos } =
          work

        const tipoId = tipoPorCodigo.get(workType.code)
        if (tipoId === undefined) {
          throw new Error(
            `El tipo de trabajo "${workType.code}" no existe. Siembra los catalogos primero.`,
          )
        }

        const estadoId = estadoPorCodigo.get(academicStatus.code)
        if (estadoId === undefined) {
          throw new Error(`El estado academico "${academicStatus.code}" no existe.`)
        }

        const creado = await tx.work.create({
          data: {
            ...datos,
            editorialStatus: datos.editorialStatus as EditorialStatus,
            workTypeId: tipoId,
            academicStatusId: estadoId,
            venueId: venue === null ? null : (revistaPorNombre.get(venue.name) ?? null),
            // `published_at` lo pone el caso de uso al publicar; aqui el contenido ya
            // viene publicado, asi que se sella con la fecha del despliegue.
            publishedAt: datos.editorialStatus === 'published' ? new Date() : null,
          },
        })

        for (const autor of authors) {
          const personId = personaPorNombre.get(autor.person.fullName)
          if (personId === undefined) {
            throw new Error(
              `La persona "${autor.person.fullName}" no esta en el contenido inicial.`,
            )
          }
          await tx.workAuthor.create({
            data: {
              workId: creado.id,
              personId,
              authorOrder: autor.authorOrder,
              contributionRole: autor.contributionRole,
              isCorresponding: autor.isCorresponding,
            },
          })
        }

        for (const { tag } of tags) {
          const tagId = etiquetaPorSlug.get(tag.slug)
          if (tagId !== undefined) {
            await tx.workTag.create({ data: { workId: creado.id, tagId } })
          }
        }

        for (const enlace of links) {
          await tx.workLink.create({ data: { workId: creado.id, ...enlace } })
        }

        for (const cita of workCitations) {
          const styleId = estiloPorCodigo.get(cita.style.code)
          if (styleId !== undefined) {
            await tx.workCitation.create({
              data: { workId: creado.id, citationStyleId: styleId, content: cita.content },
            })
          }
        }
      }

      // --- Cursos y sus ediciones -------------------------------------------
      for (const curso of CONTENIDO.courses) {
        const { tags, offerings, ...datos } = curso
        const creado = await tx.course.create({
          data: {
            ...datos,
            editorialStatus: datos.editorialStatus as EditorialStatus,
            publishedAt: datos.editorialStatus === 'published' ? new Date() : null,
          },
        })

        // Hoy ningun curso lleva etiquetas, asi que el fichero generado deja el array
        // vacio y TypeScript no puede inferir que hay dentro. El tipo se dice aqui.
        for (const { tag } of tags as Array<{ tag: { slug: string } }>) {
          const tagId = etiquetaPorSlug.get(tag.slug)
          if (tagId !== undefined) {
            await tx.courseTag.create({ data: { courseId: creado.id, tagId } })
          }
        }

        for (const edicion of offerings) {
          const { institution, department, teachers, ...datosEdicion } = edicion

          const institutionId = institucionPorNombre.get(institution.name)
          if (institutionId === undefined) {
            throw new Error(`La institucion "${institution.name}" no esta en el contenido inicial.`)
          }

          const creada = await tx.courseOffering.create({
            data: {
              ...datosEdicion,
              editorialStatus: datosEdicion.editorialStatus as EditorialStatus,
              courseId: creado.id,
              institutionId,
              departmentId:
                department === null ? null : (departamentoPorNombre.get(department.name) ?? null),
              publishedAt: datosEdicion.editorialStatus === 'published' ? new Date() : null,
            },
          })

          for (const docente of teachers) {
            const personId = personaPorNombre.get(docente.person.fullName)
            if (personId !== undefined) {
              await tx.courseOfferingTeacher.create({
                data: {
                  courseOfferingId: creada.id,
                  personId,
                  role: docente.role,
                  sortOrder: docente.sortOrder,
                },
              })
            }
          }
        }
      }

      // --- Trayectoria del titular -------------------------------------------
      //
      // Va despues de instituciones y personas porque cuelga de las dos. Sin ella la
      // banda de cargos de la portada no se pinta: no es que salga vacia, es que no
      // existe.
      const titularId = personaPorNombre.get(
        CONTENIDO.personas.find((persona) => persona.isSiteOwner)?.fullName ?? '',
      )

      if (titularId !== undefined) {
        for (const afiliacion of CONTENIDO.afiliaciones) {
          const { institution, department, ...datos } = afiliacion
          const institutionId = institucionPorNombre.get(institution.name)
          if (institutionId === undefined) {
            throw new Error(`La institucion "${institution.name}" no esta en el contenido inicial.`)
          }

          await tx.affiliation.create({
            data: {
              ...datos,
              personId: titularId,
              institutionId,
              // El departamento es opcional, y su clave compuesta con la institucion es
              // la que RN-006 protege: si el nombre no cuadra, se deja vacio en lugar
              // de enganchar el de otra universidad.
              departmentId:
                department === null ? null : (departamentoPorNombre.get(department.name) ?? null),
            },
          })
        }
      }

      // --- Noticias y entradas de blog ---------------------------------------
      for (const entrada of CONTENIDO.posts) {
        await tx.post.create({
          data: {
            ...entrada,
            editorialStatus: entrada.editorialStatus as EditorialStatus,
          },
        })
      }

      // --- Eventos -----------------------------------------------------------
      for (const evento of CONTENIDO.events) {
        const { institutions, ...datos } = evento
        const creado = await tx.event.create({
          data: {
            ...datos,
            editorialStatus: datos.editorialStatus as EditorialStatus,
            publishedAt: datos.editorialStatus === 'published' ? new Date() : null,
          },
        })

        for (const { institution } of institutions) {
          const institutionId = institucionPorNombre.get(institution.name)
          if (institutionId !== undefined) {
            await tx.eventInstitution.create({
              data: { eventId: creado.id, institutionId },
            })
          }
        }
      }

      // --- Textos de las paginas y visibilidad de las secciones -------------
      for (const pagina of CONTENIDO.pages) {
        await tx.pageContent.updateMany({
          where: { pageKey: pagina.pageKey },
          data: {
            pageTitle: pagina.pageTitle,
            eyebrow: pagina.eyebrow,
            introMarkdown: pagina.introMarkdown,
            secondaryMarkdown: pagina.secondaryMarkdown,
            heroAlt: pagina.heroAlt,
            isPublished: pagina.isPublished,
          },
        })
      }

      for (const seccion of CONTENIDO.sections) {
        await tx.pageSection.updateMany({
          where: { pageKey: seccion.pageKey, sectionKey: seccion.sectionKey },
          data: {
            isVisible: seccion.isVisible,
            backgroundOverlay: seccion.backgroundOverlay,
            sortOrder: seccion.sortOrder,
          },
        })
      }

      // --- Configuracion del sitio ------------------------------------------
      //
      // `publicBaseUrl` no viene en el fichero: es propia de cada instalacion y la fija
      // PUBLIC_BASE_URL en `site-settings.seed`. Traer aqui la direccion de la maquina
      // de desarrollo dejaria el sitemap apuntando a localhost.
      if (CONTENIDO.settings !== null) {
        await tx.siteSettings.updateMany({ data: CONTENIDO.settings })
      }
    },
    // El contenido entero son unas doscientas escrituras: el limite de 5 s por defecto
    // se queda corto contra una base que no esta en la misma maquina.
    { timeout: 120_000, maxWait: 20_000 },
  )

  return 'seeded'
}
