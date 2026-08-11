import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/query-keys'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { listDepartments } from '../api'

type Props = {
  institutionId: string | null
  value: string | null
  onChange: (departmentId: string | null) => void
  disabled?: boolean
}

/**
 * Selector de departamento acotado a una institucion.
 *
 * Es la traduccion de RN-006 a la interfaz: en lugar de dejar elegir cualquier
 * departamento y devolver un 422 al guardar, la lista solo contiene los de la
 * institucion seleccionada. El backend sigue validandolo —y la clave foranea compuesta
 * tambien—, pero el usuario no llega a equivocarse.
 *
 * Sin institucion elegida el control queda deshabilitado, con la razon a la vista:
 * `forms-and-workflows.md:50-52` pide explicar la dependencia junto al control, no
 * dejar un desplegable vacio sin motivo.
 */
export function DepartmentSelect({
  institutionId,
  value,
  onChange,
  disabled,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.departments.list(institutionId ?? undefined),
    queryFn: () => listDepartments(institutionId ?? undefined),
    enabled: institutionId !== null,
  })

  const departamentos = data ?? []
  const sinInstitucion = institutionId === null

  return (
    <div className='grid gap-1'>
      <Select
        value={value ?? '__none__'}
        disabled={disabled === true || sinInstitucion || isLoading}
        onValueChange={(seleccion) => {
          onChange(seleccion === '__none__' ? null : seleccion)
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder='No department' />
        </SelectTrigger>
        <SelectContent>
          {/* El departamento es opcional (ERS §23), asi que "ninguno" es una opcion
              legitima y no la ausencia de eleccion. */}
          <SelectItem value='__none__'>No department</SelectItem>
          {departamentos.map((departamento) => (
            <SelectItem key={departamento.id} value={departamento.id}>
              {departamento.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sinInstitucion && (
        <p className='text-xs text-muted-foreground'>
          Choose an institution first.
        </p>
      )}
      {!sinInstitucion && !isLoading && departamentos.length === 0 && (
        <p className='text-xs text-muted-foreground'>
          This institution has no departments recorded.
        </p>
      )}
    </div>
  )
}
