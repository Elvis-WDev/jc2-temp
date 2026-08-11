import { cn } from '@/lib/utils'

/**
 * Texto largo que el titular escribe en Markdown y la API entrega ya convertido a
 * HTML **y ya saneado** (ERS §37, `shared/markdown/render.ts`).
 *
 * Ese es el motivo de que aqui se pueda insertar directamente: el saneado ocurre en un
 * unico sitio, en el servidor, y no depende de que cada pantalla se acuerde. Si alguna
 * vez se pinta aqui HTML que venga de otro sitio que no sea un presenter publico, esta
 * garantia deja de valer.
 */
export function RichText({
  html,
  className,
}: {
  html: string | null
  className?: string
}) {
  if (html === null || html.trim() === '') return null

  return (
    <div
      className={cn('space-y-4 leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
