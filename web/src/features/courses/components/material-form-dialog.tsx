import { useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileUp, Loader2, X } from 'lucide-react'
import { applyApiFieldErrors } from '@/lib/api/form-errors'
import { queryKeys } from '@/lib/api/query-keys'
import { conValorActual, useCatalogTerms } from '@/hooks/use-catalog-terms'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { UploadDialog } from '@/features/media/components/upload-dialog'
import { createMaterial, updateMaterial, type CourseMaterial } from '../api'

/**
 * Un material es un archivo **o** un enlace, nunca los dos ni ninguno (ERS §24).
 *
 * La API lo rechaza con 422, pero aquí se plantea como una elección desde el principio:
 * se elige el origen y solo se pide lo que corresponde. Así la regla no se descubre
 * fallando.
 */

const formSchema = z
  .object({
    origen: z.enum(['archivo', 'enlace']),
    mediaId: z.string(),
    mediaNombre: z.string(),
    externalUrl: z.string(),
    materialType: z.string().trim().min(1, 'Choose a type.').max(50),
    title: z.string().trim().min(1, 'Required.').max(250),
    description: z.string().max(5000),
    isPublic: z.boolean(),
  })
  .superRefine((valores, ctx) => {
    if (valores.origen === 'archivo' && valores.mediaId === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['mediaId'],
        message: 'Upload a file or switch to a link.',
      })
    }
    if (valores.origen === 'enlace') {
      if (valores.externalUrl.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['externalUrl'],
          message: 'Write the address or switch to a file.',
        })
      } else if (!URL.canParse(valores.externalUrl)) {
        ctx.addIssue({
          code: 'custom',
          path: ['externalUrl'],
          message: 'Write a full address, starting with https://',
        })
      }
    }
  })

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  offeringId: string
  material?: CourseMaterial
}

export function MaterialFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, offeringId, material }: Omit<Props, 'open'>) {
  const esEdicion = material !== undefined
  const [subiendo, setSubiendo] = useState(false)
  const { terminos } = useCatalogTerms('course_material')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origen:
        material?.externalUrl !== null && material !== undefined
          ? 'enlace'
          : 'archivo',
      mediaId: material?.mediaId ?? '',
      mediaNombre:
        material?.mediaId === null || material === undefined
          ? ''
          : 'File chosen',
      externalUrl: material?.externalUrl ?? '',
      materialType: material?.materialType ?? 'syllabus',
      title: material?.title ?? '',
      description: material?.description ?? '',
      isPublic: material?.isPublic ?? false,
    },
  })

  const origen = useWatch({ control: form.control, name: 'origen' })
  const mediaNombre = useWatch({ control: form.control, name: 'mediaNombre' })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      // Se envía uno y se anula el otro de forma explícita: al cambiar de origen en una
      // edición hay que borrar el anterior, o quedarían los dos y la API respondería 422.
      const comun = {
        mediaId: values.origen === 'archivo' ? values.mediaId : null,
        externalUrl:
          values.origen === 'enlace' ? values.externalUrl.trim() : null,
        materialType: values.materialType,
        title: values.title,
        description:
          values.description.trim() === '' ? null : values.description.trim(),
        isPublic: values.isPublic,
      }
      return esEdicion
        ? updateMaterial(material.id, comun)
        : createMaterial({ courseOfferingId: offeringId, ...comun })
    },
    invalidates: [queryKeys.courses.all],
    success: esEdicion ? 'Material updated.' : 'Material added.',
    onSuccess: () => {
      onOpenChange(false)
    },
    onError: (error) => applyApiFieldErrors(form, error),
  })

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            guardar.mutate(values)
          })}
          className='grid gap-4'
        >
          <DialogHeader>
            <DialogTitle>
              {esEdicion ? 'Edit material' : 'New material'}
            </DialogTitle>
            <DialogDescription>
              The syllabus, slides or problem sets for this offering.
            </DialogDescription>
          </DialogHeader>

          <FormField
            control={form.control}
            name='materialType'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {conValorActual(terminos, field.value).map((tipo) => (
                      <SelectItem key={tipo.code} value={tipo.code}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='title'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder='Course syllabus' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='origen'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Where it comes from</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className='flex gap-6'
                  >
                    <div className='flex items-center gap-2'>
                      <RadioGroupItem value='archivo' id='origen-archivo' />
                      <Label htmlFor='origen-archivo' className='font-normal'>
                        An uploaded file
                      </Label>
                    </div>
                    <div className='flex items-center gap-2'>
                      <RadioGroupItem value='enlace' id='origen-enlace' />
                      <Label htmlFor='origen-enlace' className='font-normal'>
                        An external link
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {origen === 'archivo' ? (
            <FormField
              control={form.control}
              name='mediaId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  {field.value === '' ? (
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full'
                      onClick={() => {
                        setSubiendo(true)
                      }}
                    >
                      <FileUp /> Upload file
                    </Button>
                  ) : (
                    <div className='flex items-center justify-between gap-2 rounded-md border px-3 py-2'>
                      <span className='truncate text-sm'>{mediaNombre}</span>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        aria-label='Remove the file'
                        onClick={() => {
                          form.setValue('mediaId', '')
                          form.setValue('mediaNombre', '')
                        }}
                      >
                        <X className='size-4' />
                      </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name='externalUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='https://ejemplo.edu/programa.pdf'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='isPublic'
            render={({ field }) => (
              <FormItem className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2'>
                <div className='space-y-0.5'>
                  <Label htmlFor='material-publico'>Visible on the site</Label>
                  <p className='text-xs text-muted-foreground'>
                    {field.value
                      ? 'Anyone will be able to open it from the course page.'
                      : 'Only you see it, in this panel.'}
                  </p>
                </div>
                <FormControl>
                  <Switch
                    id='material-publico'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={guardar.isPending}
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={guardar.isPending}>
              {guardar.isPending && <Loader2 className='animate-spin' />}
              {esEdicion ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      <UploadDialog
        open={subiendo}
        onOpenChange={setSubiendo}
        onUploaded={(asset) => {
          form.setValue('mediaId', asset.id)
          form.setValue('mediaNombre', asset.originalFilename)
          form.clearErrors('mediaId')
        }}
      />
    </>
  )
}
