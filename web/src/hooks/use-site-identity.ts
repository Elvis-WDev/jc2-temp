import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/query-keys'

/**
 * El nombre y el emblema del sitio, para que el panel se presente con ellos.
 *
 * Sale de `/api/public/site`, que **no pide sesion**: por eso lo puede usar tambien la
 * pantalla de acceso, donde todavia no hay ninguna. No expone nada nuevo, es lo mismo
 * que ya lee cualquier visitante de la web.
 *
 * Si la peticion falla o no hay nada configurado, quien lo use cae a su texto por
 * defecto. Un panel sin nombre propio sigue siendo utilizable; uno que no carga, no.
 */
type SitioPublico = {
  siteName: string
  logoUrl: string | null
}

export function useSiteIdentity(): {
  nombre: string | null
  logoUrl: string | null
} {
  const { data } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: () => get<SitioPublico>('/api/public/site'),
    // Cambia cuando el titular toca Configuracion del sitio, no cada minuto.
    staleTime: 5 * 60_000,
    // En la pantalla de acceso no hay sesion y un fallo aqui no debe llenar de avisos:
    // el nombre por defecto basta para entrar.
    retry: false,
  })

  return {
    nombre: data?.siteName ?? null,
    logoUrl: data?.logoUrl ?? null,
  }
}
