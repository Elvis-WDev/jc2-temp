import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { ApiError } from '@/lib/api/api-error'
import { getSession, signIn } from '@/lib/api/auth'
import { applyApiFieldErrors } from '@/lib/api/form-errors'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Introduce tu email.' : undefined),
  }),
  password: z.string().min(1, 'Enter your password.'),
})

type FormValues = z.infer<typeof formSchema>

/**
 * Traduce el fallo a algo accionable.
 *
 * Distinguir el motivo importa mas aqui que en ninguna otra pantalla: si el servidor
 * o la base de datos estan caidos, el usuario debe saberlo. Mostrar el mismo "no se
 * pudo iniciar sesion" ante un 500 le hace dudar de su contrasena y perder el tiempo
 * reintentando algo que nunca va a funcionar.
 */
function mensajeDeError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Could not sign in.'

  switch (error.code) {
    case 'LOGIN_RATE_LIMITED':
    case 'RATE_LIMITED':
      return 'Too many attempts. Wait a minute before trying again.'
    case 'ACCOUNT_DISABLED':
      return 'This account is disabled. Contact the administrator.'
    case 'ADMIN_ROLE_REQUIRED':
      return 'This account does not have administrator permissions.'
    case 'NETWORK_ERROR':
      return 'The server could not be reached. Check that the API is running.'
    default:
      break
  }

  // Sin respuesta del servidor: la API no esta escuchando.
  if (error.status === 0) {
    return 'The server could not be reached. Check that the API is running.'
  }

  // 5xx: el fallo es del servidor, no de las credenciales. Casi siempre es la base
  // de datos caida o sin migrar.
  if (error.isUnexpected) {
    const referencia =
      error.requestId === '' ? '' : ` (referencia: ${error.requestId})`
    return `Error del servidor al iniciar sesion${referencia}. Revisa que la base de datos este disponible.`
  }

  // Better Auth responde 401 ante credenciales invalidas. No se distingue email
  // inexistente de contrasena incorrecta a proposito: eso permitiria enumerar cuentas.
  if (error.status === 401) return 'Incorrect email or password.'

  return 'Could not sign in.'
}

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await signIn(values)
      // Se relee la sesion en vez de fiarse del cuerpo del login: asi el usuario que
      // guardamos es exactamente el que el backend considera autenticado, con su rol
      // y su estado activo.
      return getSession()
    },
    onSuccess: async (user) => {
      setUser(user)
      queryClient.setQueryData(queryKeys.session, user)
      // Sin destino guardado se entra al panel, no a la raiz: la raiz es el sitio
      // publico y quien acaba de identificarse venia a administrar.
      await navigate({ to: redirectTo || '/admin', replace: true })
    },
    onError: (error) => {
      if (applyApiFieldErrors(form, error)) return
      form.setError('root', { type: 'server', message: mensajeDeError(error) })
    },
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='name@example.com'
                  autoComplete='username'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='********'
                  autoComplete='current-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className='text-sm text-destructive' role='alert'>
            {form.formState.errors.root.message}
          </p>
        )}

        <Button className='mt-2' disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className='animate-spin' />
          ) : (
            <LogIn />
          )}
          Sign in
        </Button>
      </form>
    </Form>
  )
}
