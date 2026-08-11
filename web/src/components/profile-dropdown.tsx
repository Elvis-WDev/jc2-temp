import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut, UserCog } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((parte) => parte !== '')
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('')
}

export function ProfileDropdown() {
  const [cerrando, setCerrando] = useState(false)
  const user = useAuthStore((state) => state.user)

  const nombre = user?.name ?? 'Session'

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='relative size-8 rounded-full'
            aria-label='Your account'
          >
            <Avatar className='size-8'>
              <AvatarFallback>{iniciales(nombre)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>{nombre}</p>
              <p className='text-xs leading-none text-muted-foreground'>
                {user?.email ?? ''}
              </p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to='/admin/profile'>
              <UserCog />
              Mi perfil academico
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => {
              setCerrando(true)
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={cerrando} onOpenChange={setCerrando} />
    </>
  )
}
