import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/api-error'
import { handleServerError } from '@/lib/handle-server-error'

/**
 * Mutacion con aviso automatico.
 *
 * Toda accion avisa de como acabo, sin depender de que cada pantalla se acuerde de
 * ponerlo. Los errores pasan por el traductor comun, que ya distingue error de campo,
 * error de negocio y fallo del servidor.
 */
type Options<TData, TVars> = Omit<
  UseMutationOptions<TData, Error, TVars>,
  'mutationFn' | 'onSuccess' | 'onError'
> & {
  mutationFn: (variables: TVars) => Promise<TData>
  /** Texto del aviso al terminar bien. Puede depender del resultado. */
  success: string | ((data: TData, variables: TVars) => string)
  /** Claves de consulta a refrescar tras el exito. */
  invalidates?: readonly (readonly unknown[])[]
  onSuccess?: (data: TData, variables: TVars) => void | Promise<void>
  /** Devuelve true si ya se mostro el error y no hace falta el aviso generico. */
  onError?: (error: Error, variables: TVars) => boolean | void
}

export function useToastMutation<TData, TVars = void>(
  options: Options<TData, TVars>
): UseMutationResult<TData, Error, TVars> {
  const queryClient = useQueryClient()
  const { mutationFn, success, invalidates, onSuccess, onError, ...resto } =
    options

  return useMutation<TData, Error, TVars>({
    ...resto,
    mutationFn,
    onSuccess: async (data, variables) => {
      await Promise.all(
        (invalidates ?? []).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      )
      toast.success(
        typeof success === 'function' ? success(data, variables) : success
      )
      await onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      // Si la pantalla lo maneja (por ejemplo pintandolo en un campo del formulario),
      // no se duplica en un aviso flotante.
      if (onError?.(error, variables) === true) return
      handleServerError(error)
    },
  })
}

/** Mensaje del error, ya traducido, para usarlo dentro de un formulario. */
export function mensajeDeApiError(
  error: unknown,
  porDefecto = 'It could not be completed.'
): string {
  return error instanceof ApiError ? error.message : porDefecto
}
