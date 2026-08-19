import { describe, expect, it, vi } from 'vitest'
import { escribirConSlugLibre, generateSlug, resolveSlugOnUpdate, withSuffix } from './Slug.js'

/** Como lo cuenta Prisma cuando choca la restriccion unica del slug. */
function colisionDeSlug() {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { driverAdapterError: { cause: { constraint: { fields: ['slug'] } } } },
  })
}

describe('escribir con un slug libre', () => {
  it('usa el slug base cuando nadie lo ocupa', async () => {
    const escribir = vi.fn().mockResolvedValue('creado')

    await escribirConSlugLibre({
      base: 'mi-titulo',
      existe: () => Promise.resolve(false),
      escribir,
      agotado: () => Promise.resolve('agotado'),
    })

    expect(escribir).toHaveBeenCalledWith('mi-titulo')
  })

  it('salta a un sufijo cuando el slug ya esta cogido', async () => {
    const escribir = vi.fn().mockResolvedValue('creado')

    await escribirConSlugLibre({
      base: 'mi-titulo',
      existe: (slug) => Promise.resolve(slug === 'mi-titulo'),
      escribir,
      agotado: () => Promise.resolve('agotado'),
    })

    expect(escribir).toHaveBeenCalledWith('mi-titulo-2')
  })

  it('reintenta si otra peticion se lleva el slug entre la comprobacion y la escritura', async () => {
    // El caso que motivo todo esto: las dos altas vieron el slug libre, y la segunda
    // moria con un 409 en algo que el titular tiene derecho a hacer dos veces.
    const escribir = vi
      .fn<(slug: string) => Promise<string>>()
      .mockRejectedValueOnce(colisionDeSlug())
      .mockResolvedValueOnce('creado')

    const resultado = await escribirConSlugLibre({
      base: 'mi-titulo',
      existe: () => Promise.resolve(false),
      escribir,
      agotado: () => Promise.resolve('agotado'),
    })

    expect(resultado).toBe('creado')
    expect(escribir.mock.calls.map((llamada) => llamada[0])).toEqual(['mi-titulo', 'mi-titulo-2'])
  })

  it('un fallo que no es del slug sube tal cual', async () => {
    const otro = Object.assign(new Error('el disco esta lleno'), { code: 'P1017' })

    await expect(
      escribirConSlugLibre({
        base: 'mi-titulo',
        existe: () => Promise.resolve(false),
        escribir: () => Promise.reject(otro),
        agotado: () => Promise.resolve('agotado'),
      }),
    ).rejects.toBe(otro)
  })

  it('choque con otra columna unica tampoco se reintenta', async () => {
    // Un DOI repetido no se arregla cambiando el slug: reintentar lo escondería.
    const porDoi = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['doi'] },
    })

    await expect(
      escribirConSlugLibre({
        base: 'mi-titulo',
        existe: () => Promise.resolve(false),
        escribir: () => Promise.reject(porDoi),
        agotado: () => Promise.resolve('agotado'),
      }),
    ).rejects.toBe(porDoi)
  })

  it('agotados los intentos, decide quien llama', async () => {
    const resultado = await escribirConSlugLibre({
      base: 'mi-titulo',
      existe: () => Promise.resolve(true),
      escribir: () => Promise.resolve('creado'),
      agotado: () => Promise.resolve('agotado'),
    })

    expect(resultado).toBe('agotado')
  })
})

describe('generar el slug', () => {
  it('lo deja en minusculas y sin acentos', () => {
    expect(generateSlug('Diseño de Mecanismos')).toBe('diseno-de-mecanismos')
  })

  it('el primer intento no lleva sufijo', () => {
    expect(withSuffix('mi-titulo', 1)).toBe('mi-titulo')
    expect(withSuffix('mi-titulo', 3)).toBe('mi-titulo-3')
  })

  it('RN-010: publicado no cambia aunque cambie el titulo', () => {
    expect(
      resolveSlugOnUpdate({
        slugActual: 'el-original',
        tituloNuevo: 'Un titulo completamente distinto',
        yaPublicado: true,
      }),
    ).toBe('el-original')
  })
})
