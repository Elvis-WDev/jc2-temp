import { get, patch } from '@/lib/api/client'

/**
 * Cliente de `/api/admin/site-settings`.
 *
 * Es un único registro: no se crea ni se borra, solo se lee y se edita.
 */

export interface SiteSettings {
  id: string
  siteName: string
  ownerPersonId: string
  defaultLocale: string
  timezone: string
  publicBaseUrl: string
  contactEmail: string | null
  metaTitleDefault: string | null
  metaDescriptionDefault: string | null
  ogImageMediaId: string | null
  /** Emblema de la cabecera del sitio. Vacio: se muestra el nombre. */
  logoMediaId: string | null
  footerText: string | null
}

export type SiteSettingsInput = Partial<
  Omit<SiteSettings, 'id' | 'ownerPersonId'>
>

export function getSiteSettings(): Promise<SiteSettings> {
  return get<SiteSettings>('/api/admin/site-settings')
}

export function updateSiteSettings(
  input: SiteSettingsInput
): Promise<SiteSettings> {
  return patch<SiteSettings>('/api/admin/site-settings', input)
}
