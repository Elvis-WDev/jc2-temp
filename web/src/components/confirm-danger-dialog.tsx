import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Confirmación antes de una acción con consecuencias.
 *
 * Tiene dos niveles, y el que corresponde depende de si la acción se puede deshacer:
 *
 * - **Borrar** no se deshace, así que pide escribir el nombre exacto. Un único botón de
 *   "¿Seguro?" se pulsa por inercia; esto obliga a mirar qué hay seleccionado.
 * - **Ocultar o archivar** sí se deshace desde el propio panel, así que basta con
 *   explicar qué va a pasar y pedir un clic deliberado. Pedir el nombre escrito para
 *   algo reversible entrena a la gente a teclear sin leer, y entonces deja de proteger
 *   también donde importa.
 */

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sobre qué actúa. Con `requireTypedName`, es el texto que habrá que escribir. */
  name: string
  title: string
  /** Qué ocurre exactamente al confirmar. */
  description: string
  /** Aviso extra si la acción arrastra otros datos. */
  warning?: string
  confirmText?: string
  isLoading?: boolean
  /** Por defecto sí: se asume lo irreversible salvo que se diga lo contrario. */
  requireTypedName?: boolean
  onConfirm: () => void
}

export function ConfirmDangerDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        {/* El contenido se monta de nuevo en cada apertura, asi que el paso y el texto
            escrito vuelven a cero solos: no hace falta reiniciarlos a mano. */}
        <Contenido onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Contenido({
  onOpenChange,
  name,
  title,
  description,
  warning,
  confirmText = 'Delete',
  isLoading = false,
  requireTypedName = true,
  onConfirm,
}: Omit<Props, 'open'>) {
  const [paso, setPaso] = useState<1 | 2>(1)
  const [escrito, setEscrito] = useState('')

  const coincide = escrito.trim() === name.trim()

  return (
    <>
      <DialogHeader>
        <DialogTitle className='flex items-center gap-2'>
          <AlertTriangle
            className={cn(
              'size-5',
              requireTypedName
                ? 'text-destructive'
                : 'text-amber-600 dark:text-amber-500'
            )}
            aria-hidden
          />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {warning !== undefined && (
        <p
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            requireTypedName
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          )}
        >
          {warning}
        </p>
      )}

      {paso === 2 && (
        <div className='grid gap-2'>
          <Label htmlFor='confirmar-nombre'>
            Type <span className='font-semibold'>{name}</span> to confirm
          </Label>
          <Input
            id='confirmar-nombre'
            value={escrito}
            onChange={(event) => {
              setEscrito(event.target.value)
            }}
            placeholder={name}
            autoComplete='off'
            autoFocus
          />
        </div>
      )}

      <DialogFooter>
        <Button
          variant='outline'
          disabled={isLoading}
          onClick={() => {
            onOpenChange(false)
          }}
        >
          Cancel
        </Button>

        {requireTypedName && paso === 1 ? (
          <Button
            variant='destructive'
            onClick={() => {
              setPaso(2)
            }}
          >
            Continuar
          </Button>
        ) : (
          <Button
            variant={requireTypedName ? 'destructive' : 'default'}
            disabled={(requireTypedName && !coincide) || isLoading}
            onClick={onConfirm}
          >
            {isLoading && <Loader2 className='animate-spin' />}
            {confirmText}
          </Button>
        )}
      </DialogFooter>
    </>
  )
}
