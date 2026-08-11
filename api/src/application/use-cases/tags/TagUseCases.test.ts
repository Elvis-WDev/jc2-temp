import { describe, expect, it } from 'vitest'
import type { TagRecord, TagRepository, TagUsage } from '../../ports/repositories/TagRepository.js'
import { TagUseCases } from './TagUseCases.js'

const SIN_USO: TagUsage = { works: 0, courses: 0, total: 0 }

function construir(opciones: { existentes?: TagRecord[]; usos?: TagUsage } = {}) {
  const porSlug = new Map((opciones.existentes ?? []).map((tag) => [tag.slug, tag]))
  const porId = new Map((opciones.existentes ?? []).map((tag) => [tag.id, tag]))
  const creados: Array<{ name: string; slug: string; category: string | null }> = []
  const actualizados: Array<Record<string, unknown>> = []
  const borrados: string[] = []

  const repo = {
    findBySlug: (slug: string) => Promise.resolve(porSlug.get(slug) ?? null),
    findById: (id: string) => Promise.resolve(porId.get(id) ?? null),
    create: (input: { name: string; slug: string; category?: string | null }) => {
      const fila: TagRecord = {
        id: 'nuevo',
        name: input.name,
        slug: input.slug,
        category: input.category ?? null,
        sortOrder: 0,
        isActive: true,
      }
      creados.push({ name: fila.name, slug: fila.slug, category: fila.category })
      return Promise.resolve(fila)
    },
    update: (id: string, input: Record<string, unknown>) => {
      actualizados.push(input)
      return Promise.resolve({ ...(porId.get(id) as TagRecord), ...input })
    },
    delete: (id: string) => {
      borrados.push(id)
      return Promise.resolve()
    },
    countUsage: () => Promise.resolve(opciones.usos ?? SIN_USO),
  } as unknown as TagRepository

  return { casos: new TagUseCases(repo), creados, actualizados, borrados }
}

const BEHAVIORAL: TagRecord = {
  id: 'tag-behavioral',
  name: 'Behavioral Economics',
  slug: 'behavioral-economics',
  category: 'field',
  sortOrder: 0,
  isActive: true,
}

// RF-007: el ERS pone estos tres literales como el problema a evitar.
describe('RF-007: no se duplican tags por capitalizacion', () => {
  it('crea un tag nuevo derivando el slug del nombre', async () => {
    const { casos, creados } = construir()

    await casos.create({ name: 'Behavioral Economics' })

    expect(creados[0]).toMatchObject({
      name: 'Behavioral Economics',
      slug: 'behavioral-economics',
    })
  })

  it.each([
    'behavioral economics',
    'Behavioral economics',
    'BEHAVIORAL ECONOMICS',
    '  Behavioral   Economics  ',
  ])('rechaza "%s" porque colapsa al slug de uno existente', async (nombre) => {
    const { casos, creados } = construir({ existentes: [BEHAVIORAL] })

    await expect(casos.create({ name: nombre })).rejects.toMatchObject({
      httpStatus: 409,
      code: 'TAG_ALREADY_EXISTS',
    })
    expect(creados).toHaveLength(0)
  })

  it('el 409 incluye el id del tag existente para poder reutilizarlo', async () => {
    const { casos } = construir({ existentes: [BEHAVIORAL] })

    await expect(casos.create({ name: 'behavioral economics' })).rejects.toMatchObject({
      fields: { existingTagId: 'tag-behavioral' },
    })
  })

  it('nombres realmente distintos si crean tags distintos', async () => {
    const { casos, creados } = construir({ existentes: [BEHAVIORAL] })

    await casos.create({ name: 'Mechanism Design' })

    expect(creados[0]?.slug).toBe('mechanism-design')
  })
})

describe('renombrar no regenera el slug', () => {
  it('corregir el nombre conserva el slug, que viaja en los filtros publicos', async () => {
    const { casos, actualizados } = construir({ existentes: [BEHAVIORAL] })

    await casos.update('tag-behavioral', { name: 'Behavioural Economics' })

    expect(actualizados[0]).toEqual({ name: 'Behavioural Economics' })
    expect(actualizados[0]).not.toHaveProperty('slug')
  })
})

describe('borrado', () => {
  it('borra un tag sin uso', async () => {
    const { casos, borrados } = construir({ existentes: [BEHAVIORAL] })

    await casos.delete('tag-behavioral', false)

    expect(borrados).toEqual(['tag-behavioral'])
  })

  it('un tag en uso devuelve 409 y no se borra', async () => {
    const { casos, borrados } = construir({
      existentes: [BEHAVIORAL],
      usos: { works: 3, courses: 1, total: 4 },
    })

    await expect(casos.delete('tag-behavioral', false)).rejects.toMatchObject({
      httpStatus: 409,
      code: 'TAG_IN_USE',
    })
    expect(borrados).toHaveLength(0)
  })

  it('el mensaje enumera solo los usos que existen', async () => {
    const { casos } = construir({
      existentes: [BEHAVIORAL],
      usos: { works: 3, courses: 0, total: 3 },
    })

    await expect(casos.delete('tag-behavioral', false)).rejects.toThrowError(
      expect.objectContaining({ message: expect.stringContaining('3 trabajos') }),
    )
  })

  it('force borra aunque este en uso', async () => {
    const { casos, borrados } = construir({
      existentes: [BEHAVIORAL],
      usos: { works: 3, courses: 1, total: 4 },
    })

    await casos.delete('tag-behavioral', true)

    expect(borrados).toEqual(['tag-behavioral'])
  })

  it('borrar un tag inexistente devuelve 404', async () => {
    const { casos } = construir()

    await expect(casos.delete('no-existe', false)).rejects.toMatchObject({
      httpStatus: 404,
      code: 'TAG_NOT_FOUND',
    })
  })
})
