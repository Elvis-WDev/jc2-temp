import {
  Newspaper,
  PenLine,
  Building2,
  CalendarDays,
  FileText,
  FolderOpen,
  GraduationCap,
  Image,
  LayoutDashboard,
  Link2,
  ScrollText,
  Settings,
  SlidersHorizontal,
  UserCog,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

/**
 * Navegacion del panel, segun ERS §35.
 *
 * Dos niveles como maximo (`navigation-responsive.md`). El ERS advierte ademas de no
 * exponer tablas tecnicas que el academico no necesita navegar: por eso no hay
 * entradas para work_authors, work_links ni work_files, que se editan dentro del
 * formulario del trabajo al que pertenecen.
 */
export const sidebarData: SidebarData = {
  user: {
    name: '',
    email: '',
    avatar: '',
  },
  teams: [],
  navGroups: [
    // Sin rotulo: una sola entrada no necesita que le pongan titulo encima, y ese
    // titulo cuesta 40px de los 756 que hay.
    {
      title: '',
      items: [{ title: 'Dashboard', url: '/admin', icon: LayoutDashboard }],
    },
    {
      title: 'Profile',
      items: [
        { title: 'Academic profile', url: '/admin/profile', icon: UserCog },
        { title: 'Affiliations', url: '/admin/affiliations', icon: Building2 },
        { title: 'Links', url: '/admin/person-links', icon: Link2 },
      ],
    },
    {
      // Research, Teaching, Events y News & blog eran cuatro grupos de uno, dos y tres
      // entradas: cuatro rotulos para nueve destinos. Juntos caben en uno y el menu
      // entero deja de necesitar scroll.
      title: 'Content',
      items: [
        { title: 'Work', url: '/admin/works', icon: FileText },
        { title: 'Authors', url: '/admin/persons', icon: Users },
        { title: 'Courses', url: '/admin/courses', icon: GraduationCap },
        { title: 'Events', url: '/admin/events', icon: CalendarDays },
        { title: 'News', url: '/admin/posts/news', icon: Newspaper },
        { title: 'Blog', url: '/admin/posts/blog', icon: PenLine },
      ],
    },
    {
      title: 'Website',
      items: [
        { title: 'Page content', url: '/admin/page-content', icon: FolderOpen },
        { title: 'Files', url: '/admin/media', icon: Image },
        { title: 'Site settings', url: '/admin/site-settings', icon: Settings },
      ],
    },
    {
      title: 'System',
      items: [
        {
          // Ocho pantallas que se tocan una vez al ano —doce tipos de trabajo, nueve
          // estados, seis revistas— ocupaban ocho sitios en una lista que no cabia.
          // Plegadas ocupan uno, y cada una conserva su direccion.
          title: 'Configuration',
          icon: SlidersHorizontal,
          items: [
            { title: 'Work types', url: '/admin/work-types' },
            { title: 'Academic statuses', url: '/admin/academic-statuses' },
            { title: 'Venues', url: '/admin/venues' },
            { title: 'Citation styles', url: '/admin/citation-styles' },
            { title: 'Tags', url: '/admin/tags' },
            { title: 'Institutions', url: '/admin/institutions' },
            { title: 'Departments', url: '/admin/departments' },
            { title: 'Catalogues', url: '/admin/catalogs' },
          ],
        },
        { title: 'Audit log', url: '/admin/audit-log', icon: ScrollText },
      ],
    },
  ],
}
