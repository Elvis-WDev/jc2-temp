import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ResearchFacets } from '../api'

/**
 * Barra lateral de filtros de Research.
 *
 * **Seleccion simple, no multiple.** La plantilla los dibuja como casillas, pero la API
 * publica acepta un tipo y una etiqueta, no varios: aceptar listas obligaria a tocar
 * las consultas del repositorio publico y sus facetas, que es justo donde vive RN-001.
 * Con los recuentos delante, elegir uno se comporta igual de bien. Volver a pulsar el
 * que ya esta elegido lo quita.
 *
 * Nada de estado local: todo lo que se elige aqui viaja en la direccion, asi que
 * copiar el enlace reproduce lo que se esta viendo y el boton de volver funciona.
 */

export type FiltrosResearch = {
  q?: string
  type?: string
  status?: string
  tag?: string
  year_from?: number
  year_to?: number
}

type Props = {
  facets: ResearchFacets
  filtros: FiltrosResearch
  onChange: (cambio: Partial<FiltrosResearch>) => void
}

export function ResearchFilters({ facets, filtros, onChange }: Props) {
  return (
    <aside className='flex flex-col gap-8 lg:sticky lg:top-24 lg:col-span-3 lg:self-start'>
      <BuscadorArchivo
        valor={filtros.q ?? ''}
        onChange={(q) => {
          onChange({ q: q === '' ? undefined : q })
        }}
      />

      <div className='flex flex-col gap-6'>
        {facets.types.length > 0 && (
          <GrupoLista
            titulo='Publication type'
            opciones={facets.types.map((tipo) => ({
              valor: tipo.code,
              etiqueta: tipo.label,
              cuenta: tipo.count,
            }))}
            elegido={filtros.type}
            onElegir={(type) => {
              onChange({ type })
            }}
          />
        )}

        {facets.statuses.length > 0 && (
          <GrupoLista
            titulo='Status'
            opciones={facets.statuses.map((estado) => ({
              valor: estado.value,
              etiqueta: estado.label,
              cuenta: estado.count,
            }))}
            elegido={filtros.status}
            onElegir={(status) => {
              onChange({ status })
            }}
          />
        )}

        {facets.tags.length > 0 && (
          <GrupoEtiquetas
            titulo='Topic'
            opciones={facets.tags}
            elegido={filtros.tag}
            onElegir={(tag) => {
              onChange({ tag })
            }}
          />
        )}

        {facets.years.length > 0 && (
          <GrupoAnio
            anios={facets.years}
            desde={filtros.year_from}
            hasta={filtros.year_to}
            onElegir={(rango) => {
              onChange(rango)
            }}
          />
        )}
      </div>
    </aside>
  )
}

function BuscadorArchivo({
  valor,
  onChange,
}: {
  valor: string
  onChange: (valor: string) => void
}) {
  return (
    <form
      role='search'
      className='relative w-full'
      onSubmit={(evento) => {
        evento.preventDefault()
        const campo = evento.currentTarget.elements.namedItem('q')
        if (campo instanceof HTMLInputElement) onChange(campo.value.trim())
      }}
    >
      <Search
        aria-hidden
        className='absolute start-3 top-1/2 size-4 -translate-y-1/2 text-site-on-surface-variant/50'
      />
      <input
        name='q'
        type='search'
        // Sin `key` el campo no se repinta al limpiar los filtros desde fuera.
        key={valor}
        defaultValue={valor}
        aria-label='Search the publications'
        placeholder='Search the archive...'
        className='w-full rounded-site border border-site-outline-variant bg-site-surface py-3 ps-10 pe-4 text-site-on-surface transition-colors placeholder:text-site-on-surface-variant/50 focus-visible:border-site-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-primary'
      />
    </form>
  )
}

function TituloDeGrupo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className='border-b border-site-outline-variant pb-2 text-site-label tracking-widest text-site-on-surface uppercase'>
      {children}
    </h2>
  )
}

function GrupoLista({
  titulo,
  opciones,
  elegido,
  onElegir,
}: {
  titulo: string
  opciones: Array<{ valor: string; etiqueta: string; cuenta: number }>
  elegido: string | undefined
  onElegir: (valor: string | undefined) => void
}) {
  return (
    <div className='flex flex-col gap-3'>
      <TituloDeGrupo>{titulo}</TituloDeGrupo>
      <div className='flex flex-col gap-2'>
        {opciones.map((opcion) => {
          const activa = elegido === opcion.valor
          return (
            <button
              key={opcion.valor}
              type='button'
              aria-pressed={activa}
              onClick={() => {
                onElegir(activa ? undefined : opcion.valor)
              }}
              className={cn(
                'flex items-center justify-between gap-3 text-start transition-colors',
                activa
                  ? 'font-semibold text-site-primary'
                  : 'text-site-on-surface-variant hover:text-site-on-surface'
              )}
            >
              <span>{opcion.etiqueta}</span>
              <span className='text-site-meta text-site-on-surface-variant/70'>
                {opcion.cuenta}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GrupoEtiquetas({
  titulo,
  opciones,
  elegido,
  onElegir,
}: {
  titulo: string
  opciones: ResearchFacets['tags']
  elegido: string | undefined
  onElegir: (valor: string | undefined) => void
}) {
  return (
    <div className='flex flex-col gap-3'>
      <TituloDeGrupo>{titulo}</TituloDeGrupo>
      <div className='flex flex-wrap gap-2'>
        {opciones.map((opcion) => {
          const activa = elegido === opcion.slug
          return (
            <button
              key={opcion.slug}
              type='button'
              aria-pressed={activa}
              onClick={() => {
                onElegir(activa ? undefined : opcion.slug)
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-site-meta transition-colors',
                activa
                  ? 'bg-site-primary-container text-site-on-primary'
                  : 'bg-site-inverse-on-surface text-site-on-surface hover:bg-site-surface-container-high'
              )}
            >
              {opcion.name} <span className='opacity-60'>{opcion.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Ano concreto o "y anteriores".
 *
 * Se apoya en las facetas: solo salen anos que tienen algo. La ultima opcion usa el
 * ano mas viejo como corte superior, que es lo que hace la plantilla con "2020 y
 * anteriores".
 */
function GrupoAnio({
  anios,
  desde,
  hasta,
  onElegir,
}: {
  anios: ResearchFacets['years']
  desde: number | undefined
  hasta: number | undefined
  onElegir: (rango: { year_from?: number; year_to?: number }) => void
}) {
  const recientes = anios.slice(0, 5)
  const corte = recientes[recientes.length - 1]?.year
  const hayMasAntiguos = corte !== undefined && anios.length > recientes.length

  const valorActual =
    desde !== undefined && desde === hasta
      ? String(desde)
      : hasta !== undefined && desde === undefined
        ? `hasta-${hasta}`
        : ''

  return (
    <div className='flex flex-col gap-3'>
      <TituloDeGrupo>Year</TituloDeGrupo>
      <select
        aria-label='Filter by year'
        value={valorActual}
        onChange={(evento) => {
          const valor = evento.target.value
          if (valor === '') {
            onElegir({ year_from: undefined, year_to: undefined })
          } else if (valor.startsWith('hasta-')) {
            onElegir({ year_from: undefined, year_to: Number(valor.slice(6)) })
          } else {
            onElegir({ year_from: Number(valor), year_to: Number(valor) })
          }
        }}
        className='w-full cursor-pointer appearance-none rounded-site border border-site-outline-variant bg-site-surface px-3 py-2 text-site-on-surface transition-colors focus-visible:border-site-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-primary'
      >
        <option value=''>All years</option>
        {recientes.map((anio) => (
          <option key={anio.year} value={anio.year}>
            {anio.year} ({anio.count})
          </option>
        ))}
        {hayMasAntiguos && (
          <option value={`hasta-${corte - 1}`}>{corte - 1} and earlier</option>
        )}
      </select>
    </div>
  )
}
