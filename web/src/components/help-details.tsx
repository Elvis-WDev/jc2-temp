import { type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Ayuda que se despliega.
 *
 * Para lo que hay que explicar bien una vez y estorba siempre. El cuerpo de una entrada
 * llevaba tres parrafos seguidos —Markdown, video, imagenes— con lo que se puede pegar
 * y por que YouTube y Vimeo son los unicos: sesenta palabras que se leen el primer dia
 * y se saltan los otros trescientos sesenta y cuatro.
 *
 * Un `<details>` y no un componente con estado: abre y cierra sin JavaScript, el
 * navegador ya sabe leerlo en voz alta y el buscador de la pagina encuentra el texto de
 * dentro aunque este cerrado.
 */
export function HelpDetails({
  summary,
  children,
}: {
  summary: string
  children: ReactNode
}) {
  return (
    <details className='group text-sm text-muted-foreground'>
      <summary className='inline-flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden'>
        <ChevronDown className='size-3 transition-transform group-open:rotate-180' />
        {summary}
      </summary>
      <div className='mt-2 grid gap-2 border-s ps-3'>{children}</div>
    </details>
  )
}
