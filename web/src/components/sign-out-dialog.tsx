import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { signOut } from '@/lib/api/auth'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const reset = useAuthStore((state) => state.reset)

  const handleSignOut = () => {
    // El orden importa poco para el backend, pero mucho para la interfaz: se limpia
    // primero el estado local para que ninguna pantalla siga pintando datos de la
    // sesion que se acaba de cerrar.
    reset()
    queryClient.clear()

    // La invalidacion real de la sesion es del servidor; si la peticion falla, la
    // cookie sigue viva, pero el usuario ya esta fuera de la interfaz y volvera a
    // pasar por el guard.
    void signOut().catch(() => undefined)

    void navigate({
      to: '/sign-in',
      search: { redirect: location.href },
      replace: true,
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      desc='You will have to enter your credentials again to sign back in.'
      confirmText='Sign out'
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
