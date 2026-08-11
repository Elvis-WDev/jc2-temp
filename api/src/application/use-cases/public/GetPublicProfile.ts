import { NotFoundError } from '../../../shared/errors/AppError.js'
import type { InstitutionsRepository } from '../../ports/repositories/InstitutionsRepository.js'
import type {
  AffiliationRecord,
  PeopleRepository,
  PersonLinkRecord,
  PersonRecord,
} from '../../ports/repositories/PeopleRepository.js'

export interface PublicProfile {
  person: PersonRecord
  primaryAffiliation:
    (AffiliationRecord & { institutionName: string; departmentName: string | null }) | null
  links: PersonLinkRecord[]
}

/**
 * `GET /api/public/profile` (ERS §30): el academico propietario y su afiliacion
 * principal.
 *
 * Solo se devuelven enlaces publicos: el filtro va en el repositorio, no aqui, por la
 * misma razon que el resto de filtros de publicacion.
 */
export class GetPublicProfile {
  constructor(
    private readonly people: PeopleRepository,
    private readonly institutions: InstitutionsRepository,
  ) {}

  async execute(): Promise<PublicProfile> {
    const persona = await this.people.findSiteOwner()
    if (persona === null) {
      throw new NotFoundError('The profile is not available.', 'PROFILE_NOT_FOUND')
    }

    const [afiliaciones, links] = await Promise.all([
      this.people.listAffiliations(persona.id, true),
      this.people.listPersonLinks(persona.id, true),
    ])

    // La principal, y si ninguna esta marcada como tal, la primera vigente: mejor
    // mostrar algo correcto que dejar la cabecera de Home sin afiliacion.
    const principal = afiliaciones.find((a) => a.isPrimary) ?? afiliaciones[0] ?? null

    if (principal === null) {
      return { person: persona, primaryAffiliation: null, links }
    }

    const [institucion, departamento] = await Promise.all([
      this.institutions.findInstitution(principal.institutionId),
      principal.departmentId === null
        ? Promise.resolve(null)
        : this.institutions.findDepartment(principal.departmentId),
    ])

    return {
      person: persona,
      primaryAffiliation: {
        ...principal,
        institutionName: institucion?.name ?? '',
        departmentName: departamento?.name ?? null,
      },
      links,
    }
  }
}
