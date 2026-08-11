import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type Pagination } from '@/lib/api/client'
import { cn } from '@/lib/utils'

/**
 * Paginacion del sitio publico.
 *
 * Con muchas paginas no se enumeran todas: se muestran la primera, la ultima y las
 * vecinas de la actual, con puntos suspensivos en medio, como en la plantilla.
 */
export function SitePagination({
  pagination,
  onPage,
}: {
  pagination: Pagination
  onPage: (page: number) => void
}) {
  if (pagination.totalPages <= 1) return null

  const paginas = numerosVisibles(pagination.page, pagination.totalPages)

  return (
    <nav
      aria-label='Pagination'
      className='mt-12 flex items-center justify-center gap-4 font-site-body'
    >
      <Flecha
        etiqueta='Previous page'
        deshabilitada={pagination.page <= 1}
        onClick={() => {
          onPage(pagination.page - 1)
        }}
      >
        <ChevronLeft className='size-5' />
      </Flecha>

      <div className='flex items-center gap-2 text-site-meta'>
        {paginas.map((numero, indice) =>
          numero === null ? (
            <span
              key={`hueco-${String(indice)}`}
              className='px-1 text-site-on-surface-variant'
            >
              ...
            </span>
          ) : (
            <button
              key={numero}
              type='button'
              aria-current={numero === pagination.page ? 'page' : undefined}
              onClick={() => {
                onPage(numero)
              }}
              className={cn(
                'flex size-8 items-center justify-center rounded-site transition-colors',
                numero === pagination.page
                  ? 'bg-site-primary text-site-on-primary'
                  : 'text-site-on-surface hover:bg-site-surface-container'
              )}
            >
              {numero}
            </button>
          )
        )}
      </div>

      <Flecha
        etiqueta='Next page'
        deshabilitada={pagination.page >= pagination.totalPages}
        onClick={() => {
          onPage(pagination.page + 1)
        }}
      >
        <ChevronRight className='size-5' />
      </Flecha>
    </nav>
  )
}

function Flecha({
  etiqueta,
  deshabilitada,
  onClick,
  children,
}: {
  etiqueta: string
  deshabilitada: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type='button'
      aria-label={etiqueta}
      disabled={deshabilitada}
      onClick={onClick}
      className='flex size-10 items-center justify-center rounded-site border border-site-outline-variant text-site-on-surface-variant transition-colors hover:border-site-primary hover:text-site-primary disabled:opacity-50'
    >
      {children}
    </button>
  )
}

/** `null` es un hueco con puntos suspensivos. */
function numerosVisibles(actual: number, total: number): Array<number | null> {
  if (total <= 7)
    return Array.from({ length: total }, (_, indice) => indice + 1)

  const vecinas = [actual - 1, actual, actual + 1].filter(
    (numero) => numero > 1 && numero < total
  )
  const numeros = [1, ...vecinas, total]

  const resultado: Array<number | null> = []
  for (const [indice, numero] of numeros.entries()) {
    const anterior = numeros[indice - 1]
    if (anterior !== undefined && numero - anterior > 1) resultado.push(null)
    resultado.push(numero)
  }
  return resultado
}
