import { useState } from 'react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { ConfirmDangerDialog } from '@/components/confirm-danger-dialog'
import { deleteTag, type Tag } from '../api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: Tag
}

/**
 * Borrado de una etiqueta.
 *
 * El primer intento respeta lo que ya la usa. Si esta puesta en trabajos o cursos, el
 * servidor lo rechaza y se explica en cuantos; solo entonces se ofrece quitarla de
 * todos ellos. Asi nadie borra asociaciones sin saber cuantas eran.
 */
export function TagDeleteDialog({ open, onOpenChange, tag }: Props) {
  const [enUso, setEnUso] = useState<string | null>(null)

  const borrar = useToastMutation({
    mutationFn: (force: boolean) => deleteTag(tag.id, force),
    invalidates: [queryKeys.tags.all],
    success: `Etiqueta "${tag.name}" eliminada.`,
    onSuccess: () => {
      setEnUso(null)
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'TAG_IN_USE') {
        setEnUso(error.message)
        // Ya se explica dentro del dialogo: no hace falta ademas un aviso flotante.
        return true
      }
      return false
    },
  })

  const forzando = enUso !== null

  return (
    <ConfirmDangerDialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) setEnUso(null)
        onOpenChange(abierto)
      }}
      name={tag.name}
      title={forzando ? 'The tag is in use' : 'Delete tag'}
      description={
        forzando
          ? 'If you continue, it will be removed from all the work and courses that have it.'
          : 'It will no longer be available when classifying work and courses.'
      }
      {...(forzando ? { warning: enUso } : {})}
      confirmText={forzando ? 'Remove from all and delete' : 'Delete'}
      isLoading={borrar.isPending}
      onConfirm={() => {
        borrar.mutate(forzando)
      }}
    />
  )
}
