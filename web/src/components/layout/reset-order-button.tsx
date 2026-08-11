import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useSidebarOrder } from '@/hooks/use-sidebar-order'
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar'

/**
 * Devuelve el menu a su orden original.
 *
 * Solo aparece si se ha reordenado algo: hasta entonces no hay nada que restablecer y
 * mostrarlo seria una opcion muerta ocupando sitio.
 */
export function ResetOrderButton() {
  const { restablecer, hayOrdenPersonalizado } = useSidebarOrder()
  const { state, isMobile } = useSidebar()

  if (!hayOrdenPersonalizado || (state === 'collapsed' && !isMobile))
    return null

  return (
    <SidebarMenuButton
      size='sm'
      className='text-muted-foreground'
      onClick={() => {
        restablecer()
        toast.success('Menu restored to its original order.')
      }}
    >
      <RotateCcw />
      <span>Reset menu order</span>
    </SidebarMenuButton>
  )
}
