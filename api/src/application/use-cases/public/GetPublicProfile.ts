import { NotFoundError } from '../../../shared/errors/AppError.js'
import type {
  AffiliationRecord,
  PeopleRepository,
  PersonLinkRecord,
  PersonRecord,
} from '../../ports/repositories/PeopleRepository.js'

export interface PublicProfile {
  person: PersonRecord
  primaryAffiliation: AffiliationRecord | null
  /**
   * La trayectoria completa, no solo lo vigente.
   *
   * Un cargo pasado no deja de ser cierto porque haya terminado, y es lo que cualquiera
   * espera leer en la portada de un academico: donde esta y donde ha estado. No hay
   * interruptor de visibilidad por afiliacion —no existe la columna— porque es
   * exactamente la informacion que ya figura en un CV.
   */
  affiliations: AffiliationRecord[]
  links: PersonLinkRecord[]
}

/**
 * Orden de lectura de la trayectoria: primero lo vigente, y dentro de cada grupo lo mas
 * reciente.
 *
 * Se decide aqui y no en cada cliente para que la portada, el perfil y cualquier otra
 * pantalla cuenten la misma historia en el mismo orden. Sin fecha de inicio, al final de
 * su grupo: no se puede afirmar que sea lo mas reciente.
 */
function porRecencia(a: AffiliationRecord, b: AffiliationRecord): number {
  if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
  const inicioA = a.startDate?.getTime() ?? Number.NEGATIVE_INFINITY
  const inicioB = b.startDate?.getTime() ?? Number.NEGATIVE_INFINITY
  if (inicioA !== inicioB) return inicioB - inicioA
  return a.sortOrder - b.sortOrder
}

/**
 * `GET /api/public/profile` (ERS §30): el academico propietario, su afiliacion principal
 * y su trayectoria.
 *
 * Solo se devuelven enlaces publicos: el filtro va en el repositorio, no aqui, por la
 * misma razon que el resto de filtros de publicacion.
 */
export class GetPublicProfile {
  constructor(private readonly people: PeopleRepository) {}

  async execute(): Promise<PublicProfile> {
    const persona = await this.people.findSiteOwner()
    if (persona === null) {
      throw new NotFoundError('The profile is not available.', 'PROFILE_NOT_FOUND')
    }

    const [afiliaciones, links] = await Promise.all([
      // Todas, no solo las vigentes: la banda de trayectoria necesita el historial, y
      // pedirlo dos veces para tener las dos vistas seria una consulta de mas.
      this.people.listAffiliations(persona.id, false),
      this.people.listPersonLinks(persona.id, true),
    ])

    const vigentes = afiliaciones.filter((afiliacion) => afiliacion.isCurrent)

    // La principal, y si ninguna esta marcada como tal, la primera vigente: mejor
    // mostrar algo correcto que dejar la cabecera de Home sin afiliacion. Se busca solo
    // entre las vigentes: un cargo terminado no encabeza el perfil.
    const principal = vigentes.find((a) => a.isPrimary) ?? vigentes[0] ?? null

    return {
      person: persona,
      // El repositorio ya resuelve los nombres de institucion y departamento al leer.
      // Antes se volvian a buscar aqui, uno a uno: dos consultas para reescribir dos
      // campos que ya venian rellenos.
      primaryAffiliation: principal,
      affiliations: [...afiliaciones].sort(porRecencia),
      links,
    }
  }
}
