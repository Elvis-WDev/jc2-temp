import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bold,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Quote,
} from 'lucide-react'
import { post } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { InsertImageButton } from '@/components/insert-image-button'
import { RichText } from '@/features/site/components/rich-text'

/**
 * El campo de texto largo del panel: una barra de botones y una vista previa.
 *
 * **Sigue siendo Markdown, y sigue siendo el mismo Markdown.** Los botones escriben la
 * sintaxis alrededor de lo que haya seleccionado; el texto que ya estaba guardado no se
 * vuelve a escribir nunca. Un editor visual habria tenido que convertir el Markdown a su
 * propio formato al abrir y de vuelta al guardar, y ahi se pierden cosas: la direccion de
 * video suelta en su linea —de la que depende que el reproductor aparezca— habria salido
 * convertida en un enlace corriente, y el video habria dejado de incrustarse.
 *
 * La vista previa la calcula el servidor. Convertirlo aqui habria sido mas rapido, pero
 * obligaba a repetir en el navegador el conversor, la lista de servidores de video y el
 * saneador; en cuanto una de las dos copias cambiara, la vista previa empezaria a ensenar
 * algo que la pagina no ensena.
 */

type Props = {
  /** Opcional en el esquema: react-hook-form lo entrega `undefined` hasta que se escribe. */
  value?: string | undefined
  onChange: (valor: string) => void
  onBlur?: () => void
  name?: string
  ref?: (elemento: HTMLTextAreaElement | null) => void
  rows?: number
  /**
   * Anade el boton de intercalar una imagen de la biblioteca.
   *
   * No lo llevan todos los campos aunque el servidor lo permitiria: un resumen de dos
   * lineas o el nombre de un departamento no son sitio para una foto, y un boton que no
   * se va a pulsar nunca es una cosa mas que mirar.
   */
  withImages?: boolean
}

/** Lo que hace cada boton con el texto seleccionado. */
type Herramienta = {
  icono: typeof Bold
  nombre: string
  /** Envuelve la seleccion: `**` a cada lado. */
  envoltura?: string
  /** O antepone algo a cada linea seleccionada: `- `, `> `, `## `. */
  prefijo?: string
}

const HERRAMIENTAS: Herramienta[] = [
  { icono: Bold, nombre: 'Bold', envoltura: '**' },
  { icono: Italic, nombre: 'Italic', envoltura: '_' },
  { icono: Heading2, nombre: 'Heading', prefijo: '## ' },
  { icono: List, nombre: 'Bulleted list', prefijo: '- ' },
  { icono: ListOrdered, nombre: 'Numbered list', prefijo: '1. ' },
  { icono: Quote, nombre: 'Quote', prefijo: '> ' },
]

export function MarkdownEditor({
  value: valorEntrante,
  onChange,
  onBlur,
  name,
  ref,
  rows = 8,
  withImages = false,
}: Props) {
  const value = valorEntrante ?? ''
  const campo = useRef<HTMLTextAreaElement | null>(null)
  const [previsualizando, setPrevisualizando] = useState(false)

  const vista = useQuery({
    // El texto va en la clave: mientras se previsualiza no se puede escribir, asi que
    // cada vista es una sola consulta y volver atras la encuentra ya hecha.
    queryKey: ['markdown-preview', value],
    queryFn: () =>
      post<{ html: string | null }>('/api/admin/markdown/preview', {
        markdown: value,
      }),
    enabled: previsualizando && value.trim() !== '',
    staleTime: Infinity,
  })

  /**
   * Sustituye un trozo del texto y deja la seleccion donde toca.
   *
   * Escribe con `execCommand` y no con `onChange` porque **es lo unico que conserva el
   * deshacer del navegador**. Poniendo el valor desde React se vaciaba la pila: aplicar
   * negrita y pulsar Ctrl+Z dejaba el texto con los asteriscos puestos.
   *
   * `execCommand` esta marcada como obsoleta y algun dia dejara de estar. Por eso, si
   * devuelve `false`, se escribe por el camino de antes: antes perder el deshacer que
   * perder el boton.
   */
  const reemplazar = (
    desde: number,
    hasta: number,
    texto: string,
    seleccion: [number, number]
  ) => {
    const elemento = campo.current
    if (elemento === null) return

    elemento.focus()
    elemento.setSelectionRange(desde, hasta)
    if (!document.execCommand('insertText', false, texto)) {
      onChange(value.slice(0, desde) + texto + value.slice(hasta))
    }

    // Despues del repintado: React devuelve el cursor al final del texto al re-renderizar.
    requestAnimationFrame(() => {
      campo.current?.setSelectionRange(seleccion[0], seleccion[1])
    })
  }

  const usar = ({ envoltura, prefijo }: Herramienta) => {
    const elemento = campo.current
    if (elemento === null) return
    const { selectionStart: inicio, selectionEnd: fin } = elemento

    if (envoltura !== undefined) {
      const dentro = value.slice(inicio, fin)
      const marca = envoltura.length
      // Ya estaba marcado: se quita. Asi el mismo boton pone y quita, que es lo que
      // espera cualquiera que haya usado un procesador de textos.
      const yaEstaba =
        value.slice(inicio - marca, inicio) === envoltura &&
        value.slice(fin, fin + marca) === envoltura
      if (yaEstaba) {
        reemplazar(inicio - marca, fin + marca, dentro, [
          inicio - marca,
          fin - marca,
        ])
        return
      }
      reemplazar(inicio, fin, `${envoltura}${dentro}${envoltura}`, [
        inicio + marca,
        fin + marca,
      ])
      return
    }

    if (prefijo === undefined) return

    // Los prefijos actuan sobre lineas enteras, no sobre lo que se haya soltado a medias.
    const arranque = value.lastIndexOf('\n', inicio - 1) + 1
    const remate =
      value.indexOf('\n', fin) === -1 ? value.length : value.indexOf('\n', fin)
    const lineas = value.slice(arranque, remate).split('\n')
    const todasLoTienen = lineas.every((linea) => linea.startsWith(prefijo))
    const nuevas = lineas
      .map((linea) =>
        todasLoTienen ? linea.slice(prefijo.length) : prefijo + linea
      )
      .join('\n')
    reemplazar(arranque, remate, nuevas, [arranque, arranque + nuevas.length])
  }

  const enlazar = () => {
    const elemento = campo.current
    if (elemento === null) return
    const { selectionStart: inicio, selectionEnd: fin } = elemento
    const texto =
      value.slice(inicio, fin) === '' ? 'text' : value.slice(inicio, fin)
    // El cursor queda dentro de los parentesis: la direccion es lo unico que falta.
    const posicion = inicio + texto.length + 3
    reemplazar(inicio, fin, `[${texto}](https://)`, [
      posicion,
      posicion + 'https://'.length,
    ])
  }

  /** Mete un bloque —una imagen— en su propio parrafo, donde este el cursor. */
  const insertarBloque = (fragmento: string) => {
    const posicion = campo.current?.selectionStart ?? value.length
    // Pegado al texto anterior, Markdown lo trataria como parte de esa linea.
    const antes = value.slice(0, posicion)
    const separador = antes === '' || antes.endsWith('\n') ? '' : '\n\n'
    const escrito = `${separador}${fragmento}\n\n`
    const final = posicion + escrito.length
    reemplazar(posicion, posicion, escrito, [final, final])
  }

  return (
    <div className='overflow-hidden rounded-md border'>
      <div className='flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1'>
        {HERRAMIENTAS.map((herramienta) => (
          <Button
            key={herramienta.nombre}
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            aria-label={herramienta.nombre}
            title={herramienta.nombre}
            disabled={previsualizando}
            onClick={() => {
              usar(herramienta)
            }}
          >
            <herramienta.icono className='size-4' />
          </Button>
        ))}
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7'
          aria-label='Link'
          title='Link'
          disabled={previsualizando}
          onClick={enlazar}
        >
          <Link2 className='size-4' />
        </Button>

        {withImages && (
          <span className='ms-1 flex items-center border-s ps-1.5 [&_button]:h-7'>
            <InsertImageButton
              onInsert={(fragmento) => {
                insertarBloque(fragmento)
              }}
            />
          </span>
        )}

        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='ms-auto h-7'
          onClick={() => {
            setPrevisualizando((antes) => !antes)
          }}
        >
          {previsualizando ? (
            <Pencil className='size-4' />
          ) : (
            <Eye className='size-4' />
          )}
          {previsualizando ? 'Write' : 'Preview'}
        </Button>
      </div>

      {previsualizando ? (
        <div
          className={cn(
            'min-h-24 px-3 py-2 text-sm',
            // Sin esto el HTML sale sin jerarquia: el panel no trae estilos de tipografia
            // para contenido, y un `<h2>` se veria igual que un parrafo.
            '[&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold',
            '[&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5',
            '[&_a]:underline [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_blockquote]:text-muted-foreground'
          )}
          style={{ minHeight: `${String(rows * 1.5)}rem` }}
        >
          {value.trim() === '' ? (
            <p className='text-muted-foreground'>Nothing written yet.</p>
          ) : vista.isPending ? (
            <p className='text-muted-foreground'>Loading the preview...</p>
          ) : vista.isError ? (
            <p className='text-destructive'>The preview could not be loaded.</p>
          ) : (
            <RichText html={vista.data?.html ?? null} />
          )}
        </div>
      ) : (
        <Textarea
          rows={rows}
          value={value}
          name={name}
          onChange={(evento) => {
            onChange(evento.target.value)
          }}
          {...(onBlur === undefined ? {} : { onBlur })}
          ref={(elemento) => {
            campo.current = elemento
            ref?.(elemento)
          }}
          className='rounded-none border-0 shadow-none focus-visible:ring-0'
        />
      )}
    </div>
  )
}
