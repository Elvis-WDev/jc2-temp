import { get } from '@/lib/api/client'

/** Cliente de `/api/admin/dashboard` (ERS §51). */

export interface DashboardMetrics {
  publishedWorks: number
  draftWorks: number
  featuredWorks: number
  courses: number
  activeCourseOfferings: number
  lastUpdated: {
    id: string
    type: 'work' | 'course'
    title: string
    updatedAt: string
  }[]
}

export function getDashboardMetrics(): Promise<DashboardMetrics> {
  return get<DashboardMetrics>('/api/admin/dashboard')
}
