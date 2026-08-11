import { prisma } from '../prisma/client.js'

/**
 * Catalogo de tipos de trabajo (ERS §14, RF-003).
 *
 * Es un catalogo, no un enum: anadir un tipo mas adelante es una fila, no una
 * migracion ni un cambio en la estructura de `works`.
 */
const WORK_TYPES = [
  { code: 'journal_article', label: 'Journal Article', pluralLabel: 'Journal Articles' },
  { code: 'working_paper', label: 'Working Paper', pluralLabel: 'Working Papers' },
  { code: 'work_in_progress', label: 'Work in Progress', pluralLabel: 'Work in Progress' },
  { code: 'book', label: 'Book', pluralLabel: 'Books' },
  { code: 'book_chapter', label: 'Book Chapter', pluralLabel: 'Book Chapters' },
  { code: 'conference_paper', label: 'Conference Paper', pluralLabel: 'Conference Papers' },
  { code: 'policy_report', label: 'Policy Report', pluralLabel: 'Policy Reports' },
  { code: 'research_note', label: 'Research Note', pluralLabel: 'Research Notes' },
  { code: 'thesis', label: 'Thesis', pluralLabel: 'Theses' },
  { code: 'dataset', label: 'Dataset', pluralLabel: 'Datasets' },
  { code: 'software', label: 'Software', pluralLabel: 'Software' },
  { code: 'other', label: 'Other', pluralLabel: 'Other' },
] as const

export async function seedWorkTypes(): Promise<number> {
  for (const [index, type] of WORK_TYPES.entries()) {
    await prisma.workType.upsert({
      where: { code: type.code },
      // No se pisan label ni pluralLabel: el administrador puede haberlos editado.
      update: { sortOrder: index },
      create: {
        code: type.code,
        label: type.label,
        pluralLabel: type.pluralLabel,
        sortOrder: index,
      },
    })
  }
  return WORK_TYPES.length
}
