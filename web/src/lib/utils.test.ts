import { describe, expect, it } from 'vitest'
import { cn, getPageNumbers } from './utils'

describe('getPageNumbers', () => {
  it('returns all pages when total is at most 5', () => {
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('shows ellipsis near the beginning', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, '...', 10])
    expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '...', 10])
  })

  it('shows ellipsis near the end', () => {
    expect(getPageNumbers(10, 10)).toEqual([1, '...', 7, 8, 9, 10])
    expect(getPageNumbers(9, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })

  it('shows ellipsis on both side in the middle', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10])
  })

  it('handles current page greater than total pages', () => {
    expect(getPageNumbers(6, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(11, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })
})

/**
 * `cn()` juntaba un tamano de letra y un color y se quedaba solo con el color.
 *
 * Los dos empiezan por `text-site-`, asi que `tailwind-merge` los tomaba por el mismo
 * grupo. El titulo de cada pagina salia a 16px en movil por esto; en escritorio no se
 * veia porque la variante `md:` va en otro grupo y sobrevivia.
 */
describe('cn con las clases del sitio', () => {
  it('conserva el tamano cuando ademas hay color', () => {
    const clases = cn(
      'font-site-display text-site-display-sm',
      'text-site-on-surface'
    )

    expect(clases).toContain('text-site-display-sm')
    expect(clases).toContain('text-site-on-surface')
  })

  it('sigue conservando la variante por anchura', () => {
    const clases = cn(
      'text-site-display-sm md:text-site-display-lg',
      'text-site-on-primary'
    )

    expect(clases).toContain('text-site-display-sm')
    expect(clases).toContain('md:text-site-display-lg')
  })

  it('dos tamanos del sitio si se pisan: gana el ultimo', () => {
    expect(cn('text-site-body-md', 'text-site-body-lg')).toBe(
      'text-site-body-lg'
    )
  })

  it('dos colores tambien se pisan', () => {
    expect(cn('text-site-on-surface', 'text-site-primary')).toBe(
      'text-site-primary'
    )
  })

  it('lo de Tailwind de siempre sigue funcionando', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })
})
