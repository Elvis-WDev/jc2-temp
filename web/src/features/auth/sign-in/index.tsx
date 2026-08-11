import { useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

/**
 * Unica pantalla de acceso.
 *
 * Sin enlace a registro ni a recuperar contrasena: el backend tiene el registro
 * publico deshabilitado (`disableSignUp: true`) y no expone recuperacion. Ofrecerlos
 * seria prometer algo que no existe. El unico administrador lo crea el seeder desde
 * las variables de entorno.
 */
export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Acceso</CardTitle>
          <CardDescription>
            Enter your credentials to sign in to the administration panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
