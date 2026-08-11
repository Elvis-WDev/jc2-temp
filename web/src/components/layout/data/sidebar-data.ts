import {
  BookMarked,
  Building2,
  CalendarDays,
  CircleDot,
  FileText,
  FolderOpen,
  GraduationCap,
  Image,
  Landmark,
  LayoutDashboard,
  Link2,
  ListChecks,
  Quote,
  ScrollText,
  Settings,
  Tags,
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
    {
      title: 'General',
      // El mismo nombre que el encabezado de la pantalla: llamarlo de dos formas
      // distintas hace dudar de si son dos sitios.
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
      title: 'Research',
      items: [
        { title: 'Work', url: '/admin/works', icon: FileText },
        { title: 'Authors', url: '/admin/persons', icon: Users },
        { title: 'Work types', url: '/admin/work-types', icon: ListChecks },
        {
          title: 'Academic statuses',
          url: '/admin/academic-statuses',
          icon: CircleDot,
        },
        { title: 'Venues', url: '/admin/venues', icon: BookMarked },
        {
          title: 'Citation styles',
          url: '/admin/citation-styles',
          icon: Quote,
        },
        { title: 'Tags', url: '/admin/tags', icon: Tags },
      ],
    },
    {
      title: 'Teaching',
      items: [
        { title: 'Courses', url: '/admin/courses', icon: GraduationCap },
        { title: 'Institutions', url: '/admin/institutions', icon: Building2 },
        { title: 'Departments', url: '/admin/departments', icon: Landmark },
      ],
    },
    {
      title: 'Events',
      items: [{ title: 'Events', url: '/admin/events', icon: CalendarDays }],
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
        { title: 'Catalogues', url: '/admin/catalogs', icon: ListChecks },
        { title: 'Audit log', url: '/admin/audit-log', icon: ScrollText },
      ],
    },
  ],
}
