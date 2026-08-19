import { describe, expect, it } from 'vitest'
import { fondoDeCabecera } from './page-heroes'

describe('el fondo de las cabeceras', () => {
  it('alterna en el orden del menu', async () => {
    // Un visitante que recorre el menu ve el fondo cambiar en cada salto. Estaba escrito
    // pagina a pagina y habia dejado de alternar: Events, News y Blog llevaban las tres
    // el mismo gris.
    const orden = [
      'home',
      'research',
      'teaching',
      'events',
      'news',
      'blog',
    ] as const
    const fondos = orden.map(fondoDeCabecera)
    const repetido = fondos.findIndex((f, i) => i > 0 && f === fondos[i - 1])

    expect({ repetido, fondos }).toEqual({ repetido: -1, fondos })
  })

  it('la portada abre con el claro', async () => {
    // Es el mismo color que el fondo de la pagina, asi que la cabecera de Home no se
    // despega del resto y la alternancia empieza en el salto siguiente.
    expect(fondoDeCabecera('home')).toBe('bg-site-surface')
  })
})
