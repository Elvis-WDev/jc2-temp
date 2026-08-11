import { env } from '../../../config/env.js'
import { prisma } from '../prisma/client.js'

/**
 * Persona propietaria del sitio y configuracion global (ERS §8, §26).
 *
 * `site_settings` es un singleton con clave foranea obligatoria al propietario, asi
 * que ambos se siembran juntos: sin propietario no hay configuracion que crear.
 *
 * Se crea un perfil marcador de posicion. El administrador completa nombre,
 * biografia y enlaces desde el panel; el seeder no vuelve a tocarlos.
 */
export async function seedSiteSettings(): Promise<{ ownerId: string; created: boolean }> {
  const existing = await prisma.siteSettings.findFirst({
    select: { id: true, ownerPersonId: true },
  })
  if (existing) {
    return { ownerId: existing.ownerPersonId, created: false }
  }

  const owner =
    (await prisma.person.findFirst({ where: { isSiteOwner: true }, select: { id: true } })) ??
    (await prisma.person.create({
      data: {
        isSiteOwner: true,
        fullName: 'Site Owner',
        sortName: 'Site Owner',
      },
      select: { id: true },
    }))

  await prisma.siteSettings.create({
    data: {
      siteName: 'Academic Portfolio',
      ownerPersonId: owner.id,
      defaultLocale: 'en',
      timezone: 'UTC',
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
  })

  return { ownerId: owner.id, created: true }
}
