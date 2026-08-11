import { prisma } from '../prisma/client.js'

/**
 * Vocabularios que el titular gestiona desde el panel.
 *
 * Hasta ahora estas listas vivian escritas a mano en el codigo del panel: se podian
 * ampliar, pero no desde la aplicacion. Aqui se siembran los mismos valores que ya
 * habia, para que el primer dia nada cambie de aspecto, y a partir de ahi se anaden,
 * renombran, reordenan u ocultan desde Catalogos.
 *
 * Las columnas que guardan estos codigos siguen siendo texto libre: esta tabla ofrece
 * las opciones, no restringe lo que se puede guardar.
 */

export const CATALOGS = [
  'work_link',
  'person_link',
  'work_file',
  'course_material',
  'affiliation',
  'venue',
  'event',
  'course_level',
] as const

export type Catalog = (typeof CATALOGS)[number]

const TERMINOS: Record<Catalog, Array<{ code: string; label: string; description?: string }>> = {
  work_link: [
    { code: 'publisher', label: 'Publisher' },
    { code: 'doi', label: 'DOI' },
    { code: 'pdf_external', label: 'External PDF' },
    { code: 'code', label: 'Code' },
    { code: 'dataset', label: 'Data' },
    { code: 'replication', label: 'Replication material' },
    { code: 'slides', label: 'Slides' },
    { code: 'video', label: 'Video' },
    { code: 'preprint', label: 'Preprint' },
    { code: 'project', label: 'Project' },
    { code: 'supplementary', label: 'Supplementary material' },
    { code: 'other', label: 'Other' },
  ],
  person_link: [
    { code: 'website', label: 'Personal website' },
    { code: 'orcid', label: 'ORCID' },
    { code: 'google_scholar', label: 'Google Scholar' },
    { code: 'scopus', label: 'Scopus' },
    { code: 'ssrn', label: 'SSRN' },
    { code: 'repec', label: 'RePEc' },
    { code: 'github', label: 'GitHub' },
    { code: 'linkedin', label: 'LinkedIn' },
    { code: 'x', label: 'X' },
    { code: 'bluesky', label: 'Bluesky' },
    { code: 'otro', label: 'Other' },
  ],
  work_file: [
    { code: 'paper_pdf', label: 'Paper (PDF)' },
    { code: 'appendix', label: 'Appendix' },
    { code: 'supplement', label: 'Supplementary material' },
    { code: 'code_archive', label: 'Code' },
    { code: 'data_archive', label: 'Data' },
    { code: 'slides', label: 'Slides' },
    { code: 'poster', label: 'Poster' },
    { code: 'figure', label: 'Figure' },
    { code: 'other', label: 'Other' },
  ],
  course_material: [
    { code: 'syllabus', label: 'Syllabus' },
    { code: 'slides', label: 'Slides' },
    { code: 'problem_set', label: 'Problem set' },
    { code: 'reading', label: 'Reading' },
    { code: 'exam', label: 'Exam' },
    { code: 'notes', label: 'Notes' },
    { code: 'otro', label: 'Other' },
  ],
  event: [
    { code: 'seminar', label: 'Seminar' },
    { code: 'conference', label: 'Conference' },
    { code: 'workshop', label: 'Workshop' },
    { code: 'lecture', label: 'Lecture' },
    { code: 'defence', label: 'Thesis defence' },
    { code: 'call', label: 'Call for papers' },
    { code: 'other', label: 'Other' },
  ],
  venue: [
    { code: 'journal', label: 'Journal' },
    { code: 'publisher', label: 'Publisher' },
    { code: 'conference', label: 'Conference' },
    { code: 'working_paper_series', label: 'Working paper series' },
    { code: 'repository', label: 'Repository' },
    { code: 'other', label: 'Other' },
  ],
  // Antes era un campo de texto sin sugerencias. Estos son los vinculos habituales en
  // una carrera academica; se pueden cambiar entero desde el panel.
  // Con estos se agrupan los cursos en la web publica, y la descripcion es la
  // entradilla de cada grupo. Por eso son los unicos que la traen sembrada.
  course_level: [
    {
      code: 'graduate',
      label: 'Graduate',
      description:
        "Advanced courses for master's and doctoral students, focused on contemporary methods and theoretical frontiers.",
    },
    {
      code: 'undergraduate',
      label: 'Undergraduate',
      description:
        'Core courses that build the analytical frameworks for understanding market dynamics.',
    },
    { code: 'doctoral', label: 'Doctoral' },
    { code: 'executive', label: 'Executive education' },
    { code: 'other', label: 'Other' },
  ],
  affiliation: [
    { code: 'permanent', label: 'Permanent' },
    { code: 'visiting', label: 'Visiting' },
    { code: 'honorary', label: 'Honorary' },
    { code: 'adjunct', label: 'Adjunct' },
    { code: 'emeritus', label: 'Emeritus' },
    { code: 'research', label: 'Research' },
    { code: 'other', label: 'Other' },
  ],
}

export async function seedCatalogTerms(): Promise<number> {
  let total = 0

  for (const catalog of CATALOGS) {
    for (const [indice, termino] of TERMINOS[catalog].entries()) {
      await prisma.catalogTerm.upsert({
        where: { catalog_code: { catalog, code: termino.code } },
        // No se pisa `label`: el titular puede haberlo renombrado. Tampoco `isActive`,
        // porque puede haberlo ocultado a proposito.
        // Tampoco se pisa `description`: puede haberla reescrito.
        update: { sortOrder: indice },
        create: {
          catalog,
          code: termino.code,
          label: termino.label,
          description: termino.description ?? null,
          sortOrder: indice,
        },
      })
      total += 1
    }
  }

  return total
}
