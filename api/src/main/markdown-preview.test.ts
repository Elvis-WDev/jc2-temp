import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { buildContainer } from './container.js'

/**
 * La vista previa del panel.
 *
 * Lo que se comprueba aqui no es que convierta Markdown —de eso ya se encarga
 * `render.test.ts`— sino que la respuesta salga por **el mismo camino** que el contenido
 * publicado: mismo saneado y misma incrustacion de video. Si alguien montara aqui un
 * conversor aparte «solo para previsualizar», las dos pruebas del medio caerian.
 *
 * Vive en `main` y no junto a su ruta porque monta la aplicacion entera: la capa HTTP no
 * construye infraestructura —la recibe inyectada— y la regla de capas lo impide.
 */
const app = createApp({
  ...buildContainer(),
  sessionReader: {
    getAuthenticatedUser: () =>
      Promise.resolve({
        id: 'admin-de-prueba',
        email: 'admin@ejemplo.invalid',
        name: 'Admin',
        role: 'admin',
        isActive: true,
      }),
  },
  checkDatabase: () => Promise.resolve(true),
})

const previsualizar = (markdown: string) =>
  request(app).post('/api/admin/markdown/preview').send({ markdown })

describe('la vista previa de Markdown', () => {
  it('devuelve el HTML del texto', async () => {
    const res = await previsualizar('## Titulo\n\nUn parrafo con **negrita**.')

    expect(res.status).toBe(200)
    expect(res.body.data.html).toContain('<h2>Titulo</h2>')
    expect(res.body.data.html).toContain('<strong>negrita</strong>')
  })

  it('con el texto vacio devuelve null y no una cadena vacia', async () => {
    const res = await previsualizar('   ')

    expect(res.status).toBe(200)
    expect(res.body.data.html).toBeNull()
  })

  it('sanea igual que el contenido publicado', async () => {
    const res = await previsualizar('<script>alert(1)</script>\n\nTexto.')

    expect(res.body.data.html).not.toContain('<script>')
    expect(res.body.data.html).toContain('Texto.')
  })

  it('incrusta el video igual que el contenido publicado', async () => {
    const res = await previsualizar('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    expect(res.body.data.html).toContain('<iframe')
    expect(res.body.data.html).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('rechaza un texto mas largo de lo que se puede guardar', async () => {
    const res = await previsualizar('a'.repeat(20001))

    expect(res.status).toBe(422)
  })

  it('sin sesion no se llega', async () => {
    const sinSesion = createApp({
      ...buildContainer(),
      sessionReader: { getAuthenticatedUser: () => Promise.resolve(null) },
      checkDatabase: () => Promise.resolve(true),
    })
    const res = await request(sinSesion)
      .post('/api/admin/markdown/preview')
      .send({ markdown: '# hola' })

    expect(res.status).toBe(401)
  })
})
