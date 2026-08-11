/** Metricas y ultimos cambios del panel (ERS §51). */
export interface DashboardMetrics {
  publishedWorks: number
  draftWorks: number
  featuredWorks: number
  courses: number
  activeCourseOfferings: number
  lastUpdated: Array<{ id: string; type: 'work' | 'course'; title: string; updatedAt: Date }>
}

/**
 * Puerto propio en lugar de reutilizar los repositorios de Research y Teaching: el
 * dashboard es una consulta de agregacion, no una lectura de sus agregados, y
 * mezclarla obligaria a esos repositorios a exponer recuentos que nadie mas usa.
 */
export interface DashboardRepository {
  getMetrics(): Promise<DashboardMetrics>
}

export class GetDashboardMetrics {
  constructor(private readonly repo: DashboardRepository) {}

  execute(): Promise<DashboardMetrics> {
    return this.repo.getMetrics()
  }
}
