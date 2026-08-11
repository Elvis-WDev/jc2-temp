import { describe, expect, it } from 'vitest'
import type {
  WorkTypeRecord,
  WorkTypeRepository,
} from '../../ports/repositories/WorkTypeRepository.js'
import { WorkTypeUseCases } from './WorkTypeUseCases.js'

const ARTICULO: WorkTypeRecord = {
  id: 'wt-article',
  code: 'journal_article',
  label: 'Journal Article',
  pluralLabel: 'Journal Articles',
  sortOrder: 0,
  maxItemsHome: null,
  isActive: true,
}

function construir(opciones: { existentes?: WorkTypeRecord[]; works?: number } = {}) {
  const porId = new Map((opciones.existentes ?? []).map((t) => [t.id, t]))
  const porCode = new Map((opciones.existentes ?? []).map((t) => [t.code, t]))
  const actualizados: Array<Record<string, unknown>> = []
  const borrados: string[] = []

  const repo = {
    findById: (id: string) => Promise.resolve(porId.get(id) ?? null),
    findByCode: (code: string) => Promise.resolve(porCode.get(code) ?? null),
    create: (input: Record<string, unknown>) => Promise.resolve({ ...ARTICULO, ...input }),
    update: (id: string, input: Record<string, unknown>) => {
      actualizados.push(input)
      return Promise.resolve({ ...(porId.get(id) as WorkTypeRecord), ...input })
    },
    delete: (id: string) => {
      borrados.push(id)
      return Promise.resolve()
    },
    countWorks: () => Promise.resolve(opciones.works ?? 0),
  } as unknown as WorkTypeRepository

  return { casos: new WorkTypeUseCases(repo), actualizados, borrados }
}

describe('RF-003: catalogo extensible', () => {
  it('crea un tipo nuevo', async () => {
    const { casos } = construir()

    const creado = await casos.create({
      code: 'preprint',
      label: 'Preprint',
      pluralLabel: 'Preprints',
    })

    expect(creado.code).toBe('preprint')
  })

  it('rechaza un code duplicado indicando cual existe', async () => {
    const { casos } = construir({ existentes: [ARTICULO] })

    await expect(
      casos.create({
        code: 'journal_article',
        label: 'Otro',
        pluralLabel: 'Otros',
      }),
    ).rejects.toMatchObject({
      httpStatus: 409,
      code: 'WORK_TYPE_CODE_TAKEN',
      fields: { existingWorkTypeId: 'wt-article' },
    })
  })

  it.each(['Journal Article', 'journal-article', '1tipo', 'a', 'con espacio'])(
    'rechaza el code invalido "%s"',
    (code) => {
      expect(() => {
        WorkTypeUseCases.assertValidCode(code)
      }).toThrowError(expect.objectContaining({ code: 'WORK_TYPE_INVALID_CODE' }))
    },
  )

  it('acepta codes en minusculas con guion bajo', () => {
    for (const code of ['journal_article', 'book', 'policy_report2']) {
      expect(() => {
        WorkTypeUseCases.assertValidCode(code)
      }).not.toThrow()
    }
  })
})

describe('el code es inmutable', () => {
  it('editar no puede tocar el code', async () => {
    const { casos, actualizados } = construir({ existentes: [ARTICULO] })

    await casos.update('wt-article', { label: 'Artículo de revista' })

    // El code lo usan el filtro publico ?type= y el mapeo a BibTeX: cambiarlo
    // rompería enlaces y citas ya generadas.
    expect(actualizados[0]).toEqual({ label: 'Artículo de revista' })
    expect(actualizados[0]).not.toHaveProperty('code')
  })
})

describe('borrado', () => {
  it('borra un tipo sin trabajos', async () => {
    const { casos, borrados } = construir({ existentes: [ARTICULO], works: 0 })

    await casos.delete('wt-article')

    expect(borrados).toEqual(['wt-article'])
  })

  it('un tipo en uso devuelve 409 y sugiere desactivar', async () => {
    const { casos, borrados } = construir({ existentes: [ARTICULO], works: 12 })

    await expect(casos.delete('wt-article')).rejects.toMatchObject({
      httpStatus: 409,
      code: 'WORK_TYPE_IN_USE',
    })
    expect(borrados).toHaveLength(0)
  })

  it('desactivar siempre es posible', async () => {
    const { casos } = construir({ existentes: [ARTICULO], works: 12 })

    await expect(casos.deactivate('wt-article')).resolves.toMatchObject({ isActive: false })
  })
})
