import { type PublicCourseSummary, type TeachingFacets } from './api'

export type GrupoDeCursos = {
  code: string
  label: string
  description: string | null
  cursos: PublicCourseSummary[]
}

/**
 * Reparte los cursos de la pagina en grupos, en el orden del catalogo `course_level`.
 *
 * El titulo, el orden y la entradilla de cada grupo salen de ahi, no del codigo: si
 * estuvieran escritos aqui serian lo unico de la web que no se puede cambiar desde el
 * panel.
 *
 * Los cursos sin nivel van juntos al final: dejarlos fuera los esconderia, y meterlos
 * en un grupo con nombre inventado seria peor.
 */
export function agrupar(
  cursos: PublicCourseSummary[],
  facets: TeachingFacets
): GrupoDeCursos[] {
  const grupos: GrupoDeCursos[] = facets.levels
    .map((nivel) => ({
      code: nivel.code,
      label: nivel.label,
      description: nivel.description,
      cursos: cursos.filter((curso) => curso.level === nivel.code),
    }))
    .filter((grupo) => grupo.cursos.length > 0)

  const sinNivel = cursos.filter((curso) => curso.level === null)
  if (sinNivel.length > 0) {
    grupos.push({
      code: '__sin_nivel',
      label: 'Other courses',
      description: null,
      cursos: sinNivel,
    })
  }

  return grupos
}
