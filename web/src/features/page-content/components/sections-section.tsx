import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ImagePicker } from '@/components/media-picker'
import {
  listPageSections,
  NOMBRE_DE_SECCION,
  updatePageSection,
  type PageKey,
  type PageSection,
} from '../api'

/**
 * Los bloques de una página, con su interruptor y su fondo.
 *
 * Se guardan **al momento**, no con el botón del formulario: encender o apagar un bloque
 * es una sola decisión y esperar a guardar el resto de los textos para verla aplicada
 * confunde. Es el mismo criterio que en las ediciones de un curso.
 *
 * No se crean ni se borran: las secciones las define el código y aquí solo se decide
 * cómo se ven.
 */
export function SectionsSection({
  pageKey,
  extras,
}: {
  pageKey: PageKey
  /**
   * Controles propios de una banda concreta, por clave de seccion.
   *
   * La imagen de la portada se elegia arriba del todo, entre los textos de la pagina, y
   * la banda de aqui abajo se limitaba a decir «la eliges en el campo Imagen de esta
   * pagina». Una sola cosa contada en dos sitios: ahora se elige donde vive la banda.
   */
  extras?: Partial<Record<string, ReactNode>>
}) {
  const queryClient = useQueryClient()

  const { data: secciones, isLoading } = useQuery({
    queryKey: queryKeys.pageContent.sections(pageKey),
    queryFn: () => listPageSections(pageKey),
  })

  const cambiar = useToastMutation({
    mutationFn: ({
      id,
      ...cambio
    }: {
      id: string
      isVisible?: boolean
      heading?: string | null
      headingAside?: string | null
      backgroundMediaId?: string | null
      backgroundOverlay?: number
    }) => updatePageSection(id, cambio),
    invalidates: [queryKeys.pageContent.sections(pageKey)],
    success: 'Done.',
    onSuccess: () => {
      // La web pública lee esto; su caché deja de valer.
      void queryClient.invalidateQueries({ queryKey: queryKeys.public.all })
    },
  })

  if (isLoading) {
    return (
      <p className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        Loading the sections...
      </p>
    )
  }

  if (secciones === undefined || secciones.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        This page has no blocks that can be hidden separately.
      </p>
    )
  }

  return (
    <div className='grid gap-3'>
      {secciones.map((seccion) => (
        <Bloque
          key={seccion.id}
          seccion={seccion}
          pendiente={cambiar.isPending}
          extra={extras?.[seccion.sectionKey]}
          onChange={(cambio) => {
            cambiar.mutate({ id: seccion.id, ...cambio })
          }}
        />
      ))}
    </div>
  )
}

function Bloque({
  seccion,
  pendiente,
  extra,
  onChange,
}: {
  seccion: PageSection
  pendiente: boolean
  extra?: ReactNode
  onChange: (cambio: {
    isVisible?: boolean
    heading?: string | null
    headingAside?: string | null
    backgroundMediaId?: string | null
    backgroundOverlay?: number
  }) => void
}) {
  const clave = `${seccion.pageKey}.${seccion.sectionKey}`
  // Sin nombre se muestra la clave: esconderla ocultaria que alguien anadio una seccion
  // y se olvido de bautizarla.
  const nombre = NOMBRE_DE_SECCION[clave] ?? {
    titulo: seccion.sectionKey,
    que: '',
    admiteFondo: false,
  }

  return (
    <div className='grid gap-3 rounded-lg border px-3 py-2'>
      <div className='flex items-center justify-between gap-4'>
        <div className='min-w-0 space-y-0.5'>
          <Label htmlFor={`seccion-${seccion.id}`}>{nombre.titulo}</Label>
          {nombre.que !== '' && (
            <p className='text-xs text-muted-foreground'>{nombre.que}</p>
          )}
        </div>
        <Switch
          id={`seccion-${seccion.id}`}
          checked={seccion.isVisible}
          disabled={pendiente}
          onCheckedChange={(isVisible) => {
            onChange({ isVisible })
          }}
          aria-label={`Show ${nombre.titulo} on the site`}
        />
      </div>

      {extra !== undefined && <div className='border-t pt-3'>{extra}</div>}

      {nombre.admiteTitulo === true && (
        <Rotulo
          seccion={seccion}
          ejemplo={nombre.rotuloPorDefecto ?? ''}
          onChange={onChange}
        />
      )}

      {/* Los filtros son una barra de controles: una foto detrás sólo estorbaría, así
          que ni se ofrece. */}
      {nombre.admiteFondo === true && (
        <Fondo seccion={seccion} pendiente={pendiente} onChange={onChange} />
      )}
    </div>
  )
}

/**
 * El encabezado de la banda: el título y el texto pequeño de su derecha.
 *
 * Se guarda al salir del campo, no en cada tecla: escribiendo un rótulo de catorce
 * letras saldrían catorce peticiones y trece avisos de guardado. Y sólo si ha cambiado algo, para que
 * pasar de largo con el tabulador no dispare nada.
 *
 * Estos dos campos no se bloquean mientras hay un guardado en curso, al revés que el
 * interruptor y el mando del fondo. Saltar del título al texto de al lado guarda el
 * primero, y bloquear el segundo en ese momento se comía lo que se estaba escribiendo.
 */
function Rotulo({
  seccion,
  ejemplo,
  onChange,
}: {
  seccion: PageSection
  /** El que pone el sitio si no se escribe ninguno. */
  ejemplo: string
  onChange: (cambio: {
    heading?: string | null
    headingAside?: string | null
  }) => void
}) {
  const guardarSiCambia =
    (campo: 'heading' | 'headingAside') =>
    (evento: React.FocusEvent<HTMLInputElement>) => {
      const escrito = evento.target.value.trim()
      const actual = seccion[campo] ?? ''
      if (escrito === actual) return
      // Vacío significa «el de la plantilla», y así se envía: null.
      onChange({ [campo]: escrito === '' ? null : escrito })
    }

  return (
    <div className='grid gap-2 border-t pt-3'>
      <Label htmlFor={`rotulo-${seccion.id}`}>Heading</Label>
      <p className='text-xs text-muted-foreground'>
        What this band is called on the site. Leave it empty to go back to the
        original one.
      </p>
      <div className='grid gap-2 sm:grid-cols-2'>
        <Input
          id={`rotulo-${seccion.id}`}
          defaultValue={seccion.heading ?? ''}
          maxLength={120}
          placeholder={ejemplo}
          onBlur={guardarSiCambia('heading')}
        />
        <Input
          aria-label='Small text on the right'
          defaultValue={seccion.headingAside ?? ''}
          maxLength={120}
          placeholder='Small text on the right'
          onBlur={guardarSiCambia('headingAside')}
        />
      </div>
    </div>
  )
}

function Fondo({
  seccion,
  pendiente,
  onChange,
}: {
  seccion: PageSection
  pendiente: boolean
  onChange: (cambio: {
    backgroundMediaId?: string | null
    backgroundOverlay?: number
  }) => void
}) {
  const hayImagen = seccion.backgroundMediaId !== null
  // Lo que marca el mando mientras se arrastra. Se guarda al soltar, pero el numero de
  // al lado tiene que seguir al dedo o no se sabe donde se esta dejando.
  const [previsto, setPrevisto] = useState(seccion.backgroundOverlay)

  return (
    <div className='grid gap-2 border-t pt-3'>
      <Label>Background image</Label>
      <p className='text-xs text-muted-foreground'>
        Fills the whole band. Without one, the section is drawn in its plain
        colour.
      </p>

      <ImagePicker
        value={seccion.backgroundMediaId}
        onChange={(backgroundMediaId) => {
          onChange({ backgroundMediaId })
        }}
      />

      {/* El control sólo aparece con imagen: oscurecer un fondo liso no hace nada, y
          un mando que no hace nada invita a buscarle un efecto que no tiene. */}
      {hayImagen && (
        <div className='grid gap-2 pt-1'>
          <div className='flex items-center justify-between gap-4'>
            <Label htmlFor={`oscurecer-${seccion.id}`}>Dimming</Label>
            <span className='text-xs text-muted-foreground tabular-nums'>
              {previsto}%
            </span>
          </div>
          {/* Control nativo: no hay `Slider` en el proyecto y traer una dependencia
              entera para un mando no sale a cuenta. `input[type=range]` ya funciona
              con teclado y con lector de pantalla. */}
          <input
            id={`oscurecer-${seccion.id}`}
            type='range'
            min={0}
            max={100}
            step={5}
            disabled={pendiente}
            defaultValue={seccion.backgroundOverlay}
            // `onChange` dispararia una peticion por cada paso del arrastre; el
            // navegador emite `change` una sola vez, al soltar.
            onChange={(evento) => {
              setPrevisto(Number(evento.target.value))
            }}
            onMouseUp={(evento) => {
              onChange({
                backgroundOverlay: Number(evento.currentTarget.value),
              })
            }}
            onKeyUp={(evento) => {
              onChange({
                backgroundOverlay: Number(evento.currentTarget.value),
              })
            }}
            onTouchEnd={(evento) => {
              onChange({
                backgroundOverlay: Number(evento.currentTarget.value),
              })
            }}
            className='h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50'
          />
          <p className='text-xs text-muted-foreground'>
            Dark layer over the photo. Below roughly 30% the text stops being
            legible on a light image.
          </p>
        </div>
      )}
    </div>
  )
}
