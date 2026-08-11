import type {
  DashboardMetrics,
  DashboardRepository,
} from '../../../../application/use-cases/admin/GetDashboardMetrics.js'
import { prisma } from '../client.js'

const ULTIMOS_CAMBIOS = 5

export class PrismaDashboardRepository implements DashboardRepository {
  async getMetrics(): Promise<DashboardMetrics> {
    const [
      publishedWorks,
      draftWorks,
      featuredWorks,
      courses,
      activeCourseOfferings,
      ultimosWorks,
      ultimosCursos,
    ] = await Promise.all([
      prisma.work.count({ where: { editorialStatus: 'published' } }),
      prisma.work.count({ where: { editorialStatus: 'draft' } }),
      prisma.work.count({ where: { isFeatured: true } }),
      prisma.course.count(),
      prisma.courseOffering.count({ where: { isActive: true } }),
      prisma.work.findMany({
        orderBy: { updatedAt: 'desc' },
        take: ULTIMOS_CAMBIOS,
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.course.findMany({
        orderBy: { updatedAt: 'desc' },
        take: ULTIMOS_CAMBIOS,
        select: { id: true, title: true, updatedAt: true },
      }),
    ])

    // Se mezclan works y cursos en una sola lista cronologica: al administrador le
    // interesa "que toque ultimo", no dos listas que tiene que comparar a ojo.
    const lastUpdated = [
      ...ultimosWorks.map((fila) => ({ ...fila, type: 'work' as const })),
      ...ultimosCursos.map((fila) => ({ ...fila, type: 'course' as const })),
    ]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, ULTIMOS_CAMBIOS)

    return {
      publishedWorks,
      draftWorks,
      featuredWorks,
      courses,
      activeCourseOfferings,
      lastUpdated,
    }
  }
}
