import type {
  CitationRepository,
  CitationStyleInput,
  CitationStyleRecord,
  WorkCitationRecord,
} from '../../../../application/ports/repositories/CitationRepository.js'
import { prisma } from '../client.js'

const CAMPOS_ESTILO = {
  id: true,
  code: true,
  name: true,
  extension: true,
  sortOrder: true,
  isActive: true,
} as const

const INCLUDE_CITA = { style: { select: { code: true, name: true } } } as const

function aCita(fila: {
  id: string
  workId: string
  citationStyleId: string
  content: string
  style: { code: string; name: string }
}): WorkCitationRecord {
  return {
    id: fila.id,
    workId: fila.workId,
    citationStyleId: fila.citationStyleId,
    styleCode: fila.style.code,
    styleName: fila.style.name,
    content: fila.content,
  }
}

export class PrismaCitationRepository implements CitationRepository {
  listStyles(activeOnly: boolean): Promise<CitationStyleRecord[]> {
    return prisma.citationStyle.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: CAMPOS_ESTILO,
    })
  }

  findStyleById(id: string): Promise<CitationStyleRecord | null> {
    return prisma.citationStyle.findUnique({ where: { id }, select: CAMPOS_ESTILO })
  }

  findStyleByCode(code: string): Promise<CitationStyleRecord | null> {
    return prisma.citationStyle.findUnique({ where: { code }, select: CAMPOS_ESTILO })
  }

  createStyle(input: CitationStyleInput): Promise<CitationStyleRecord> {
    return prisma.citationStyle.create({ data: input, select: CAMPOS_ESTILO })
  }

  updateStyle(
    id: string,
    input: Partial<Omit<CitationStyleInput, 'code'>>,
  ): Promise<CitationStyleRecord> {
    return prisma.citationStyle.update({ where: { id }, data: input, select: CAMPOS_ESTILO })
  }

  async deleteStyle(id: string): Promise<void> {
    await prisma.citationStyle.delete({ where: { id } })
  }

  countCitationsByStyle(styleId: string): Promise<number> {
    return prisma.workCitation.count({ where: { citationStyleId: styleId } })
  }

  async listByWork(workId: string): Promise<WorkCitationRecord[]> {
    const filas = await prisma.workCitation.findMany({
      where: { workId },
      orderBy: { style: { sortOrder: 'asc' } },
      include: INCLUDE_CITA,
    })
    return filas.map(aCita)
  }

  async upsert(
    workId: string,
    citationStyleId: string,
    content: string,
  ): Promise<WorkCitationRecord> {
    const fila = await prisma.workCitation.upsert({
      where: { workId_citationStyleId: { workId, citationStyleId } },
      update: { content },
      create: { workId, citationStyleId, content },
      include: INCLUDE_CITA,
    })
    return aCita(fila)
  }

  async remove(workId: string, citationStyleId: string): Promise<void> {
    await prisma.workCitation.delete({
      where: { workId_citationStyleId: { workId, citationStyleId } },
    })
  }
}
