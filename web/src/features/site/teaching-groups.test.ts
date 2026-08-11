import { describe, expect, it } from 'vitest'
import { type PublicCourseSummary, type TeachingFacets } from './api'
import { agrupar } from './teaching-groups'

function curso(id: string, level: string | null): PublicCourseSummary {
  return {
    id,
    slug: id,
    title: `Curso ${id}`,
    shortTitle: null,
    level,
    code: null,
    summary: null,
    tags: [],
    currentOffering: null,
    offeringCount: 0,
  }
}

const FACETS: TeachingFacets = {
  levels: [
    {
      code: 'graduate',
      label: 'Seminarios de posgrado',
      description: 'Para doctorado y master.',
      sortOrder: 0,
      count: 2,
    },
    {
      code: 'undergraduate',
      label: 'Grado',
      description: null,
      sortOrder: 1,
      count: 1,
    },
  ],
  institutions: [],
  departments: [],
  tags: [],
}

describe('agrupar cursos por nivel', () => {
  it('respeta el orden del catalogo, no el de los cursos', () => {
    const grupos = agrupar(
      [curso('a', 'undergraduate'), curso('b', 'graduate')],
      FACETS
    )

    expect(grupos.map((grupo) => grupo.code)).toEqual([
      'graduate',
      'undergraduate',
    ])
  })

  it('el titulo y la entradilla salen del catalogo', () => {
    const grupos = agrupar([curso('b', 'graduate')], FACETS)

    expect(grupos[0].label).toBe('Seminarios de posgrado')
    expect(grupos[0].description).toBe('Para doctorado y master.')
  })

  it('un grupo sin cursos en esta pagina no se pinta', () => {
    const grupos = agrupar([curso('b', 'graduate')], FACETS)

    expect(grupos).toHaveLength(1)
  })

  it('los cursos sin nivel van juntos al final, no se pierden', () => {
    const grupos = agrupar([curso('a', null), curso('b', 'graduate')], FACETS)

    expect(grupos.map((grupo) => grupo.code)).toEqual([
      'graduate',
      '__sin_nivel',
    ])
    expect(grupos[1].cursos).toHaveLength(1)
  })

  it('un nivel escrito a mano que no esta en el catalogo no esconde su curso', () => {
    // `courses.level` es texto libre: la faceta lo devuelve igual, con su propio texto.
    const conNivelSuelto: TeachingFacets = {
      ...FACETS,
      levels: [
        ...FACETS.levels,
        {
          code: 'summer school',
          label: 'summer school',
          description: null,
          sortOrder: 99,
          count: 1,
        },
      ],
    }
    const grupos = agrupar([curso('c', 'summer school')], conNivelSuelto)

    expect(grupos).toHaveLength(1)
    expect(grupos[0].label).toBe('summer school')
  })
})
