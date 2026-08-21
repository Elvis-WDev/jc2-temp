import { useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarOrder } from '@/hooks/use-sidebar-order'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from './types'

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })
  const { ordenar, guardar } = useSidebarOrder()
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [encima, setEncima] = useState<string | null>(null)

  const ordenados = ordenar(title, items)

  // Reordenar esta desactivado con el menu plegado y en movil: ahi no hay sitio para
  // agarrar nada y el gesto se confundiria con desplazar la pagina.
  const sePuedeReordenar = state !== 'collapsed' && !isMobile

  const soltar = (destino: string) => {
    if (arrastrando === null || arrastrando === destino) return

    const titulos = ordenados.map((item) => item.title)
    const desde = titulos.indexOf(arrastrando)
    const hasta = titulos.indexOf(destino)
    if (desde === -1 || hasta === -1) return

    titulos.splice(hasta, 0, ...titulos.splice(desde, 1))
    guardar(title, titulos)
    setArrastrando(null)
    setEncima(null)
  }

  /** Mover con el teclado: arrastrar no es accesible por si solo. */
  const moverConTeclado = (titulo: string, direccion: -1 | 1) => {
    const titulos = ordenados.map((item) => item.title)
    const desde = titulos.indexOf(titulo)
    const hasta = desde + direccion
    if (desde === -1 || hasta < 0 || hasta >= titulos.length) return

    titulos.splice(hasta, 0, ...titulos.splice(desde, 1))
    guardar(title, titulos)
  }

  return (
    // Sin rotulo no hace falta el aire de arriba y abajo: ese margen esta para separar
    // un bloque de su titulo, y aqui no hay titulo que separar.
    <SidebarGroup className={cn(title === '' && 'py-0')}>
      {/* Sin titulo no se pinta la caja: dejarla vacia gasta 32px de alto para no
          decir nada. */}
      {title !== '' && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
      <SidebarMenu>
        {ordenados.map((item) => {
          const key = `${item.title}-${item.url}`

          const contenido = !item.items ? (
            <SidebarMenuLink key={key} item={item} href={href} />
          ) : state === 'collapsed' && !isMobile ? (
            <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />
          ) : (
            <SidebarMenuCollapsible key={key} item={item} href={href} />
          )

          if (!sePuedeReordenar) return contenido

          return (
            <div
              key={key}
              draggable
              onDragStart={() => {
                setArrastrando(item.title)
              }}
              onDragEnd={() => {
                setArrastrando(null)
                setEncima(null)
              }}
              onDragOver={(evento) => {
                evento.preventDefault()
                setEncima(item.title)
              }}
              onDrop={(evento) => {
                evento.preventDefault()
                soltar(item.title)
              }}
              onKeyDown={(evento) => {
                // Alt + flechas reordena sin raton. Sin Alt, las flechas siguen
                // sirviendo para navegar entre enlaces.
                if (!evento.altKey) return
                if (evento.key === 'ArrowUp') {
                  evento.preventDefault()
                  moverConTeclado(item.title, -1)
                }
                if (evento.key === 'ArrowDown') {
                  evento.preventDefault()
                  moverConTeclado(item.title, 1)
                }
              }}
              className={cn(
                'group/arrastre relative rounded-md',
                arrastrando === item.title && 'opacity-40',
                encima === item.title &&
                  arrastrando !== null &&
                  arrastrando !== item.title &&
                  'ring-2 ring-primary/60'
              )}
            >
              <GripVertical
                className='pointer-events-none absolute top-1/2 -left-1 size-3 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover/arrastre:opacity-100'
                aria-hidden
              />
              {contenido}
            </div>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className='rounded-full px-1 py-0 text-xs'>{children}</Badge>
}

function SidebarMenuLink({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  const { setOpenMobile } = useSidebar()
  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(href, item, true)}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={checkIsActive(href, subItem)}
                >
                  <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                    {subItem.icon && <subItem.icon />}
                    <span>{subItem.title}</span>
                    {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(href, item)}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => (
            <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
              <Link
                to={sub.url}
                className={`${checkIsActive(href, sub) ? 'bg-secondary' : ''}`}
              >
                {sub.icon && <sub.icon />}
                <span className='max-w-52 text-wrap'>{sub.title}</span>
                {sub.badge && (
                  <span className='ms-auto text-xs'>{sub.badge}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    href === item.url || // /endpint?search=param
    href.split('?')[0] === item.url || // endpoint
    !!item?.items?.filter((i) => i.url === href).length || // if child nav is active
    (mainNav &&
      href.split('/')[1] !== '' &&
      href.split('/')[1] === item?.url?.split('/')[1])
  )
}
