import type { PaginationQuery } from '../../../shared/http/pagination.js'

/** Personas, sus enlaces y sus afiliaciones: un unico agregado (ERS §8, §9, §13). */

export interface PersonRecord {
  id: string
  isSiteOwner: boolean
  fullName: string
  givenName: string | null
  familyName: string | null
  preferredName: string | null
  professionalTitle: string | null
  currentPosition: string | null
  publicEmail: string | null
  /** ERS §8 lo marca "normalmente no visible": no sale en el presenter publico. */
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

export type PersonInput = Omit<PersonRecord, 'id' | 'isSiteOwner'>

export interface PersonLinkRecord {
  id: string
  personId: string
  linkType: string
  label: string | null
  url: string
  iconKey: string | null
  isPublic: boolean
  sortOrder: number
}

export type PersonLinkInput = Omit<PersonLinkRecord, 'id'>

export interface AffiliationRecord {
  id: string
  personId: string
  institutionId: string
  /** Nombres resueltos: la tabla del panel muestra "UNSW", no un identificador. */
  institutionName: string
  departmentId: string | null
  departmentName: string | null
  title: string
  affiliationType: string | null
  startDate: Date | null
  endDate: Date | null
  isPrimary: boolean
  isCurrent: boolean
  descriptionMarkdown: string | null
  sortOrder: number
}

/** Los nombres se resuelven al leer; al escribir solo viajan los identificadores. */
export type AffiliationInput = Omit<AffiliationRecord, 'id' | 'institutionName' | 'departmentName'>

export interface PersonUsage {
  publishedAuthorships: number
  totalAuthorships: number
  affiliations: number
  isSiteOwner: boolean
}

export interface PeopleRepository {
  listPersons(
    query: PaginationQuery,
    filters: { search: string | null },
  ): Promise<{ items: PersonRecord[]; totalItems: number }>
  findPerson(id: string): Promise<PersonRecord | null>
  findSiteOwner(): Promise<PersonRecord | null>
  createPerson(input: PersonInput): Promise<PersonRecord>
  updatePerson(id: string, input: Partial<PersonInput>): Promise<PersonRecord>
  deletePerson(id: string): Promise<void>
  countPersonUsage(id: string): Promise<PersonUsage>

  listPersonLinks(personId: string, publicOnly: boolean): Promise<PersonLinkRecord[]>
  createPersonLink(input: PersonLinkInput): Promise<PersonLinkRecord>
  updatePersonLink(id: string, input: Partial<PersonLinkInput>): Promise<PersonLinkRecord>
  deletePersonLink(id: string): Promise<void>

  listAffiliations(personId: string, currentOnly: boolean): Promise<AffiliationRecord[]>
  findAffiliation(id: string): Promise<AffiliationRecord | null>
  createAffiliation(input: AffiliationInput): Promise<AffiliationRecord>
  updateAffiliation(id: string, input: Partial<AffiliationInput>): Promise<AffiliationRecord>
  deleteAffiliation(id: string): Promise<void>
}
