import { get, patch } from '@/lib/api/client'

/** Cliente de `/api/admin/profile` (ERS §8, RF-001). Perfil del titular del sitio. */

export interface Profile {
  id: string
  isSiteOwner: boolean
  fullName: string
  givenName: string | null
  familyName: string | null
  preferredName: string | null
  professionalTitle: string | null
  currentPosition: string | null
  publicEmail: string | null
  phone: string | null
  city: string | null
  countryCode: string | null
  shortBio: string | null
  fullBioMarkdown: string | null
  researchStatementMarkdown: string | null
  photoMediaId: string | null
  cvMediaId: string | null
  orcid: string | null
  googleScholarUrl: string | null
  scopusUrl: string | null
  ssrnUrl: string | null
  repecUrl: string | null
  websiteUrl: string | null
  sortName: string | null
}

export function getProfile(): Promise<Profile> {
  return get<Profile>('/api/admin/profile')
}

export function updateProfile(
  input: Partial<Omit<Profile, 'id' | 'isSiteOwner'>>
): Promise<Profile> {
  return patch<Profile>('/api/admin/profile', input)
}
