import { Logo } from '@/assets/logo'
import { useSiteIcon } from '@/hooks/use-site-icon'
import { useSiteIdentity } from '@/hooks/use-site-identity'

type AuthLayoutProps = {
  children: React.ReactNode
}

/**
 * Envoltura de la pantalla de acceso.
 *
 * Se presenta con el emblema y el nombre que el titular configuro, no con una marca
 * generica: quien entra aqui debe reconocer de que sitio es el panel. Los datos salen
 * de `/api/public/site`, que no pide sesion.
 *
 * Mientras cargan —o si no hay nada configurado— quedan el icono y el nombre por
 * defecto. Una pantalla de acceso que no se puede usar hasta que responde una peticion
 * seria peor que una sin personalizar.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { nombre, logoUrl } = useSiteIdentity()
  useSiteIcon(logoUrl)

  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8'>
        <div className='mb-4 flex items-center justify-center gap-2'>
          {logoUrl === null ? (
            <Logo />
          ) : (
            <img
              // Decorativo: el nombre va justo al lado, y repetirlo obligaria a
              // escucharlo dos veces con un lector de pantalla.
              alt=''
              src={logoUrl}
              className='h-8 w-auto object-contain'
            />
          )}
          <h1 className='text-xl font-medium'>{nombre ?? 'Academic panel'}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
