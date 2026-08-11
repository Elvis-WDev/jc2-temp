import { generateSlug } from '../../../domain/research/Slug.js'
import { prisma } from '../prisma/client.js'

/**
 * Taxonomia inicial (ERS §17).
 *
 * Sin al menos unos cuantos tags, la pantalla de tags nace vacia y el administrador no
 * tiene de donde partir. Son solo un punto de arranque: se editan y se amplian desde
 * el panel.
 */
const TAGS = [
  { name: 'Microeconomic Theory', category: 'field' },
  { name: 'Mechanism Design', category: 'field' },
  { name: 'Behavioral Economics', category: 'field' },
  { name: 'Political Economy', category: 'field' },
  { name: 'Auctions', category: 'topic' },
  { name: 'Revenue Equivalence', category: 'topic' },
  { name: 'Dynamic Models', category: 'method' },
] as const

export async function seedTags(): Promise<number> {
  for (const [indice, tag] of TAGS.entries()) {
    const slug = generateSlug(tag.name)
    await prisma.tag.upsert({
      where: { slug },
      // Vacio: si el administrador ya renombro o recategorizo el tag, no se pisa.
      update: {},
      create: { name: tag.name, slug, category: tag.category, sortOrder: indice },
    })
  }
  return TAGS.length
}
