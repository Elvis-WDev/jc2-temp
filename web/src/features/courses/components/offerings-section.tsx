import { useState } from 'react'
import {
  Archive,
  ChevronDown,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { useCatalogTerms } from '@/hooks/use-catalog-terms'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDangerDialog } from '@/components/confirm-danger-dialog'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import {
  archiveOffering,
  deleteMaterial,
  deleteOffering,
  publishOffering,
  type Course,
  type CourseMaterial,
  type CourseOffering,
  type EditorialStatus,
} from '../api'
import { MaterialFormDialog } from './material-form-dialog'
import { OfferingFormDialog } from './offering-form-dialog'

/**
 * Ediciones de un curso, cada una con sus materiales.
 *
 * Viven dentro de la pantalla del curso porque son registros hijos suyos: la API no
 * tiene un listado suelto de ediciones ni de materiales, vienen dentro del curso. Los
 * materiales se despliegan en línea en lugar de en otra ventana para no acabar abriendo
 * un modal encima de otro.
 */

const ESTADO: Record<EditorialStatus, { texto: string; tono: StatusTone }> = {
  draft: { texto: 'Draft', tono: 'warning' },
  published: { texto: 'Published', tono: 'success' },
  archived: { texto: 'Archived', tono: 'neutral' },
}

function encabezado(edicion: CourseOffering): string {
  const partes = [
    edicion.term,
    edicion.academicYear === null ? null : String(edicion.academicYear),
  ]
    .filter((parte): parte is string => parte !== null && parte !== '')
    .join(' ')
  return partes === ''
    ? edicion.institutionName
    : `${partes} · ${edicion.institutionName}`
}

type Props = {
  course: Course
}

export function OfferingsSection({ course }: Props) {
  const { etiqueta: etiquetaMaterial } = useCatalogTerms('course_material')

  const [formEdicion, setFormEdicion] = useState<
    { abierto: true; edicion?: CourseOffering } | { abierto: false }
  >({ abierto: false })
  const [formMaterial, setFormMaterial] = useState<{
    offeringId: string
    material?: CourseMaterial
  } | null>(null)
  const [borrandoEdicion, setBorrandoEdicion] = useState<CourseOffering | null>(
    null
  )
  const [borrandoMaterial, setBorrandoMaterial] =
    useState<CourseMaterial | null>(null)

  const refresca = [queryKeys.courses.all]

  const { mutate: publicar } = useToastMutation({
    mutationFn: (id: string) => publishOffering(id),
    invalidates: refresca,
    success: 'Offering published. It now appears on the course page.',
  })

  const { mutate: archivar } = useToastMutation({
    mutationFn: (id: string) => archiveOffering(id),
    invalidates: refresca,
    success: 'Offering archived. It has been withdrawn from the site.',
  })

  const borrarEdicion = useToastMutation({
    mutationFn: (id: string) => deleteOffering(id),
    invalidates: refresca,
    success: 'Offering deleted.',
    onSuccess: () => {
      setBorrandoEdicion(null)
    },
    onError: () => {
      setBorrandoEdicion(null)
    },
  })

  const borrarMaterial = useToastMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    invalidates: refresca,
    success: 'Material deleted.',
    onSuccess: () => {
      setBorrandoMaterial(null)
    },
    onError: () => {
      setBorrandoMaterial(null)
    },
  })

  const cursoPublicado = course.editorialStatus === 'published'

  return (
    <div className='grid gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h3 className='font-medium'>Offerings</h3>
          <p className='text-sm text-muted-foreground'>
            Each time you taught the course, with its materials.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setFormEdicion({ abierto: true })
          }}
        >
          <Plus /> Add offering
        </Button>
      </div>

      {course.offerings.length === 0 ? (
        <p className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
          No offerings. Add at least one to say where and when you teach it.
        </p>
      ) : (
        <ul className='grid gap-2'>
          {course.offerings.map((edicion) => {
            const estado = ESTADO[edicion.editorialStatus]
            const publicada = edicion.editorialStatus === 'published'

            return (
              <li key={edicion.id} className='rounded-md border'>
                <Collapsible>
                  <div className='flex flex-wrap items-center gap-2 px-3 py-2'>
                    <CollapsibleTrigger asChild>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='group -ms-2 min-w-0 flex-1 justify-start gap-2'
                      >
                        <ChevronDown className='size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180' />
                        <span className='min-w-0 truncate font-medium'>
                          {encabezado(edicion)}
                        </span>
                        <span className='shrink-0 text-xs text-muted-foreground'>
                          {edicion.teachers.length > 0 &&
                            `${edicion.teachers.map((docente) => docente.fullName).join(', ')} · `}
                          {edicion.materials.length}{' '}
                          {edicion.materials.length === 1
                            ? 'material'
                            : 'materials'}
                        </span>
                      </Button>
                    </CollapsibleTrigger>

                    <StatusBadge tone={estado.tono}>{estado.texto}</StatusBadge>
                    {edicion.isActive && (
                      <StatusBadge tone='info'>Running</StatusBadge>
                    )}

                    <div className='flex gap-1'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            aria-label={`Edit la edicion ${encabezado(edicion)}`}
                            onClick={() => {
                              setFormEdicion({ abierto: true, edicion })
                            }}
                          >
                            <Pencil className='size-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            // La API rechaza publicar una edicion de un curso que no
                            // esta publicado. Se dice antes en lugar de dejar fallar.
                            disabled={publicada || !cursoPublicado}
                            aria-label={`Publish la edicion ${encabezado(edicion)}`}
                            onClick={() => {
                              publicar(edicion.id)
                            }}
                          >
                            <Send className='size-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {publicada
                            ? 'Already published'
                            : cursoPublicado
                              ? 'Publish to the site'
                              : 'Publish the course first'}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            disabled={edicion.editorialStatus === 'archived'}
                            aria-label={`Archive la edicion ${encabezado(edicion)}`}
                            onClick={() => {
                              archivar(edicion.id)
                            }}
                          >
                            <Archive className='size-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {edicion.editorialStatus === 'archived'
                            ? 'Already archived'
                            : 'Withdraw from the site'}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            aria-label={`Delete la edicion ${encabezado(edicion)}`}
                            onClick={() => {
                              setBorrandoEdicion(edicion)
                            }}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className='grid gap-2 border-t px-3 py-3'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-sm font-medium'>Materials</span>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setFormMaterial({ offeringId: edicion.id })
                          }}
                        >
                          <Plus /> Add material
                        </Button>
                      </div>

                      {edicion.materials.length === 0 ? (
                        <p className='text-sm text-muted-foreground'>
                          No materials yet.
                        </p>
                      ) : (
                        <ul className='grid gap-1'>
                          {edicion.materials.map((material) => (
                            <li
                              key={material.id}
                              className='flex flex-wrap items-center gap-2 rounded-md border px-3 py-2'
                            >
                              {material.mediaId === null ? (
                                <ExternalLink
                                  className='size-4 shrink-0 text-muted-foreground'
                                  aria-hidden
                                />
                              ) : (
                                <FileText
                                  className='size-4 shrink-0 text-muted-foreground'
                                  aria-hidden
                                />
                              )}
                              <span className='min-w-0 flex-1 truncate text-sm'>
                                {material.title}
                              </span>
                              <StatusBadge tone='neutral' dot={false}>
                                {etiquetaMaterial(material.materialType)}
                              </StatusBadge>
                              {material.isPublic ? (
                                <StatusBadge tone='success'>
                                  On the site
                                </StatusBadge>
                              ) : (
                                <StatusBadge tone='neutral'>
                                  Only you
                                </StatusBadge>
                              )}
                              <div className='flex gap-1'>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  aria-label={`Edit ${material.title}`}
                                  onClick={() => {
                                    setFormMaterial({
                                      offeringId: edicion.id,
                                      material,
                                    })
                                  }}
                                >
                                  <Pencil className='size-4' />
                                </Button>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  aria-label={`Delete ${material.title}`}
                                  onClick={() => {
                                    setBorrandoMaterial(material)
                                  }}
                                >
                                  <Trash2 className='size-4' />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </li>
            )
          })}
        </ul>
      )}

      {formEdicion.abierto && (
        <OfferingFormDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setFormEdicion({ abierto: false })
          }}
          courseId={course.id}
          {...(formEdicion.edicion === undefined
            ? {}
            : { offering: formEdicion.edicion })}
        />
      )}

      {formMaterial !== null && (
        <MaterialFormDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setFormMaterial(null)
          }}
          offeringId={formMaterial.offeringId}
          {...(formMaterial.material === undefined
            ? {}
            : { material: formMaterial.material })}
        />
      )}

      {borrandoEdicion !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setBorrandoEdicion(null)
          }}
          name={encabezado(borrandoEdicion)}
          title='Delete offering'
          description='It will be deleted along with its materials.'
          warning='If you only want it to stop appearing on the site, archive it: it is kept and you can restore it.'
          isLoading={borrarEdicion.isPending}
          onConfirm={() => {
            borrarEdicion.mutate(borrandoEdicion.id)
          }}
        />
      )}

      {borrandoMaterial !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setBorrandoMaterial(null)
          }}
          requireTypedName={false}
          name={borrandoMaterial.title}
          title={`Remove ${borrandoMaterial.title}`}
          description='It will no longer appear in this offering.'
          warning={
            borrandoMaterial.mediaId === null
              ? 'The link is deleted from here; the page it points to does not change.'
              : 'The uploaded file is kept in Files: it is only removed from this offering.'
          }
          confirmText='Remove'
          isLoading={borrarMaterial.isPending}
          onConfirm={() => {
            borrarMaterial.mutate(borrandoMaterial.id)
          }}
        />
      )}
    </div>
  )
}
