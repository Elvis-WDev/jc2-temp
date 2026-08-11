import { describe, expect, it } from 'vitest'
import { MAX_PAGE_SIZE, buildPagination, paginationQuerySchema, toSkipTake } from './pagination.js'

describe('paginationQuerySchema', () => {
  it('aplica los valores por defecto del ERS §47', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, page_size: 20 })
  })

  it('convierte los strings que llegan por querystring', () => {
    expect(paginationQuerySchema.parse({ page: '3', page_size: '50' })).toEqual({
      page: 3,
      page_size: 50,
    })
  })

  it('rechaza page_size por encima del maximo', () => {
    expect(() => paginationQuerySchema.parse({ page_size: String(MAX_PAGE_SIZE + 1) })).toThrow()
  })

  it('rechaza page menor que 1', () => {
    expect(() => paginationQuerySchema.parse({ page: '0' })).toThrow()
  })
})

describe('toSkipTake', () => {
  it('la primera pagina no salta registros', () => {
    expect(toSkipTake({ page: 1, page_size: 20 })).toEqual({ skip: 0, take: 20 })
  })

  it('calcula el desplazamiento de paginas posteriores', () => {
    expect(toSkipTake({ page: 4, page_size: 20 })).toEqual({ skip: 60, take: 20 })
  })
})

describe('buildPagination', () => {
  it('reproduce el ejemplo del ERS §30', () => {
    expect(buildPagination({ page: 1, page_size: 20 }, 73)).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 73,
      totalPages: 4,
    })
  })

  it('una coleccion vacia tiene cero paginas', () => {
    expect(buildPagination({ page: 1, page_size: 20 }, 0).totalPages).toBe(0)
  })

  it('un resultado parcial ocupa una pagina', () => {
    expect(buildPagination({ page: 1, page_size: 20 }, 1).totalPages).toBe(1)
  })
})
