import { describe, expect, it } from 'vitest'
import { z } from '../openapi/registry.js'
import { patchSchemaOf } from './common.schemas.js'
import { affiliationPatchSchema, personLinkPatchSchema } from './profile.schemas.js'
import { materialUpdateSchema } from './teaching.schemas.js'

/**
 * Cubre un fallo de perdida silenciosa de datos: `.partial()` no quita los valores por
 * defecto, asi que un PATCH que no mencionaba un campo se lo llevaba puesto igualmente.
 *
 * Comprobado contra la base de datos: cambiar el origen de un material dejaba
 * `is_public` en falso y el material desaparecia de la web publica sin que nadie lo
 * hubiera ocultado.
 */

const alta = z.object({
  titulo: z.string(),
  isPublic: z.boolean().default(false),
  mediaId: z.uuid().nullable().default(null),
  sortOrder: z.number().int().min(0).default(0),
})

describe('esquema derivado para un PATCH', () => {
  it('no rellena lo que la peticion no trae', () => {
    expect(patchSchemaOf(alta).parse({ titulo: 'x' })).toEqual({ titulo: 'x' })
  })

  it('respeta lo que si trae, incluido un valor igual al de por defecto', () => {
    expect(patchSchemaOf(alta).parse({ isPublic: false })).toEqual({ isPublic: false })
  })

  it('sigue validando', () => {
    expect(patchSchemaOf(alta).safeParse({ sortOrder: -1 }).success).toBe(false)
    expect(patchSchemaOf(alta).safeParse({ mediaId: 'no-es-uuid' }).success).toBe(false)
  })

  it('el esquema de alta no cambia: ahi los valores por defecto si hacen falta', () => {
    expect(alta.parse({ titulo: 'x' })).toEqual({
      titulo: 'x',
      isPublic: false,
      mediaId: null,
      sortOrder: 0,
    })
  })
})

describe('los esquemas reales que estaban afectados', () => {
  it('editar un material no lo oculta ni le quita el archivo', () => {
    expect(materialUpdateSchema.parse({ title: 'Programa' })).toEqual({ title: 'Programa' })
  })

  it('editar una afiliacion no la marca como no vigente', () => {
    expect(affiliationPatchSchema.parse({ title: 'Profesor' })).toEqual({ title: 'Profesor' })
  })

  it('editar un enlace no cambia su visibilidad', () => {
    expect(personLinkPatchSchema.parse({ url: 'https://ejemplo.test' })).toEqual({
      url: 'https://ejemplo.test',
    })
  })
})
