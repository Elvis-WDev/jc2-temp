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
      className={cn(
        'space-y-4 leading-relaxed',
        // El reproductor de video llega del servidor sin clase ninguna —el saneador no
        // deja pasar atributos que no esten en su lista—, asi que se le da forma desde
        // fuera: ancho completo y proporcion de video, en lugar del recuadro pequeno y
        // fijo que trae por defecto.
        '[&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-site [&_iframe]:border-0',
        // Una imagen intercalada llega tambien sin clase: se le pone tope de ancho para
        // que una foto grande no rompa la columna de texto.
        '[&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-site',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
