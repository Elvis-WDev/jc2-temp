/**
 * Claves de React Query en un solo sitio.
 *
 * Invalidar tras una mutacion deja de depender de recordar la clave exacta que uso la
 * consulta. Es la causa habitual de "guarde y la tabla no se actualizo".
 */
export const queryKeys = {
  session: ['session'] as const,

  dashboard: ['dashboard'] as const,

  tags: {
    all: ['tags'] as const,
    list: (filtros?: unknown) => ['tags', 'list', filtros ?? {}] as const,
    detail: (id: string) => ['tags', 'detail', id] as const,
    categories: ['tags', 'categories'] as const,
  },
  workTypes: {
    all: ['work-types'] as const,
    list: (filtros?: unknown) => ['work-types', 'list', filtros ?? {}] as const,
  },
  academicStatuses: {
    all: ['academic-statuses'] as const,
    list: (activeOnly?: boolean) =>
      ['academic-statuses', 'list', activeOnly ?? false] as const,
  },
  catalogTerms: {
    all: ['catalog-terms'] as const,
    list: (catalog?: string, activeOnly?: boolean) =>
      ['catalog-terms', 'list', catalog ?? null, activeOnly ?? false] as const,
  },
  institutions: {
    all: ['institutions'] as const,
    list: (filtros?: unknown) =>
      ['institutions', 'list', filtros ?? {}] as const,
    detail: (id: string) => ['institutions', 'detail', id] as const,
  },
  departments: {
    all: ['departments'] as const,
    list: (institutionId?: string) =>
      ['departments', 'list', institutionId ?? null] as const,
  },
  affiliations: {
    all: ['affiliations'] as const,
    list: (personId: string) => ['affiliations', 'list', personId] as const,
  },
  personLinks: {
    all: ['person-links'] as const,
    list: (personId: string) => ['person-links', 'list', personId] as const,
  },
  media: {
    all: ['media'] as const,
    list: (filtros?: unknown) => ['media', 'list', filtros ?? {}] as const,
  },
  profile: ['profile'] as const,
  persons: {
    all: ['persons'] as const,
    list: (filtros?: unknown) => ['persons', 'list', filtros ?? {}] as const,
  },
  events: {
    all: ['events'] as const,
    list: (filtros?: unknown) => ['events', 'list', filtros ?? {}] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
  },
  citationStyles: {
    all: ['citation-styles'] as const,
    list: (activeOnly?: boolean) =>
      ['citation-styles', 'list', activeOnly ?? false] as const,
  },
  workCitations: {
    all: ['work-citations'] as const,
    byWork: (workId: string) => ['work-citations', workId] as const,
  },
  venues: {
    all: ['venues'] as const,
    list: (filtros?: unknown) => ['venues', 'list', filtros ?? {}] as const,
  },
  works: {
    all: ['works'] as const,
    list: (filtros?: unknown) => ['works', 'list', filtros ?? {}] as const,
    detail: (id: string) => ['works', 'detail', id] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (filtros?: unknown) => ['courses', 'list', filtros ?? {}] as const,
    detail: (id: string) => ['courses', 'detail', id] as const,
  },
  pageContent: {
    all: ['page-content'] as const,
    detail: (pageKey: string) => ['page-content', pageKey] as const,
    sections: (pageKey: string) =>
      ['page-content', pageKey, 'sections'] as const,
  },
  siteSettings: ['site-settings'] as const,
  auditLog: (filtros?: unknown) => ['audit-log', filtros ?? {}] as const,

  /**
   * Lo que lee el sitio publico. Va en su propio espacio porque no comparte cache con
   * el panel: son endpoints distintos y, sobre todo, el publico solo ve lo publicado.
   * Mezclarlos haria que una pantalla del panel pintase datos filtrados por RN-001, o
   * al reves.
   */
  public: {
    all: ['public'] as const,
    home: ['public', 'home'] as const,
    site: ['public', 'site'] as const,
    research: (filtros?: unknown) =>
      ['public', 'research', filtros ?? {}] as const,
    work: (idOrSlug: string) => ['public', 'work', idOrSlug] as const,
    page: (pageKey: string) => ['public', 'page', pageKey] as const,
    teaching: (filtros?: unknown) =>
      ['public', 'teaching', filtros ?? {}] as const,
    course: (idOrSlug: string) => ['public', 'course', idOrSlug] as const,
    events: (filtros?: unknown) => ['public', 'events', filtros ?? {}] as const,
    event: (idOrSlug: string) => ['public', 'event', idOrSlug] as const,
  },
} as const
