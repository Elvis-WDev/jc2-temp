import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSiteIdentity } from '@/hooks/use-site-identity'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '../ui/button'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  const { nombre, logoUrl } = useSiteIdentity()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-0 py-0 hover:bg-transparent active:bg-transparent'
          asChild
        >
          <div>
            <Link
              to='/admin'
              onClick={() => setOpenMobile(false)}
              className='flex flex-1 items-center gap-2 text-start text-sm leading-tight'
            >
              {logoUrl !== null && (
                <img
                  alt=''
                  src={logoUrl}
                  className='h-7 w-auto shrink-0 object-contain'
                />
              )}
              <span className='grid min-w-0 flex-1'>
                <span className='truncate font-bold'>
                  {nombre ?? 'Academic panel'}
                </span>
                <span className='truncate text-xs'>Site administration</span>
              </span>
            </Link>
            <ToggleSidebar />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function ToggleSidebar({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar='trigger'
      data-slot='sidebar-trigger'
      variant='ghost'
      size='icon'
      className={cn('aspect-square size-8 max-md:scale-125', className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <X className='md:hidden' />
      <Menu className='max-md:hidden' />
      <span className='sr-only'>Open or close the menu</span>
    </Button>
  )
}
