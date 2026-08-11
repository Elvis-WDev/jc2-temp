import { useState } from 'react'
import { es } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import { type DateRange } from 'react-day-picker'
import { LOCALE } from '@/lib/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

/**
 * Filtro por rango de fechas, con el mismo aspecto que los de opciones para que la fila
 * de filtros se lea como un conjunto.
 *
 * Trabaja con fechas en formato `AAAA-MM-DD`, no con instantes: quien filtra piensa en
 * dias enteros. Convertir el dia a un intervalo con hora es cosa de quien lo usa, que es
 * el que sabe si el "hasta" incluye el dia entero.
 */

const FORMATO = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
})

type Props = {
  title: string
  from: string | undefined
  to: string | undefined
  onChange: (rango: {
    from: string | undefined
    to: string | undefined
  }) => void
}

/** `AAAA-MM-DD` en hora local: `toISOString` daria el dia anterior al oeste de Londres. */
function aTexto(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${String(fecha.getFullYear())}-${mes}-${dia}`
}

function aFecha(texto: string | undefined): Date | undefined {
  if (texto === undefined || texto === '') return undefined
  const [anio, mes, dia] = texto.split('-').map(Number)
  if (anio === undefined || mes === undefined || dia === undefined)
    return undefined
  return new Date(anio, mes - 1, dia)
}

export function DateRangeFilter({ title, from, to, onChange }: Props) {
  const [abierto, setAbierto] = useState(false)

  const desde = aFecha(from)
  const hasta = aFecha(to)
  const hayRango = desde !== undefined || hasta !== undefined

  const etiqueta =
    desde !== undefined && hasta !== undefined
      ? `${FORMATO.format(desde)} – ${FORMATO.format(hasta)}`
      : desde !== undefined
        ? `Desde ${FORMATO.format(desde)}`
        : hasta !== undefined
          ? `Hasta ${FORMATO.format(hasta)}`
          : null

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-8 border-dashed'>
          <CalendarIcon className='size-4' />
          {title}
          {etiqueta !== null && (
            <>
              <Separator orientation='vertical' className='mx-2 h-4' />
              <span className='font-normal'>{etiqueta}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='range'
          locale={es}
          numberOfMonths={2}
          autoFocus
          {...(desde === undefined && hasta === undefined
            ? {}
            : { defaultMonth: desde ?? hasta })}
          selected={{ from: desde, to: hasta } as DateRange}
          onSelect={(rango: DateRange | undefined) => {
            onChange({
              from: rango?.from === undefined ? undefined : aTexto(rango.from),
              to: rango?.to === undefined ? undefined : aTexto(rango.to),
            })
          }}
        />

        {hayRango && (
          <div className='border-t p-2'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full'
              onClick={() => {
                onChange({ from: undefined, to: undefined })
                setAbierto(false)
              }}
            >
              <X className='size-4' /> Clear dates
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
