import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { buildContainer } from './container.js'

// Se parte del contenedor real para montar las rutas de verdad, pero se sustituyen
// las dependencias que tocarian PostgreSQL: estas pruebas verifican el cableado HTTP,
// no la base de datos. Los tests de integracion contra Postgres llegan en la Fase 3.
const app = createApp({
  ...buildContainer(),
  sessionReader: { getAuthenticatedUser: () => Promise.resolve(null) },
  checkDatabase: () => Promise.resolve(true),
})

describe('health', () => {
  it('responde 200 con el envelope de exito', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: { status: 'ok', uptimeSeconds: expect.any(Number) } })
  })
})

describe('requestId', () => {
  it('devuelve un X-Request-Id generado', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['x-request-id']).toBeTruthy()
  })

  it('respeta el X-Request-Id entrante para poder seguir la traza', async () => {
    const res = await request(app).get('/health').set('X-Request-Id', 'traza-externa-123')
    expect(res.headers['x-request-id']).toBe('traza-externa-123')
  })
})

describe('envelope de error', () => {
  it('una ruta inexistente devuelve 404 con code, message y requestId', async () => {
    const res = await request(app).get('/no-existe')

    expect(res.status).toBe(404)
    expect(res.body.error).toMatchObject({
      code: 'ENDPOINT_NOT_FOUND',
      message: expect.any(String),
      requestId: expect.any(String),
    })
  })

  it('el requestId del cuerpo coincide con el de la cabecera', async () => {
    const res = await request(app).get('/no-existe')
    expect(res.body.error.requestId).toBe(res.headers['x-request-id'])
  })

  it('un JSON malformado devuelve 400, no 500', async () => {
    const res = await request(app)
      .post('/api/admin/lo-que-sea')
      .set('Content-Type', 'application/json')
      .send('{"roto": ')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('MALFORMED_JSON')
  })
})

// Plan seccion 5, capa 1: SEC-004 exige que /api/public sea estrictamente de lectura.
describe('la API publica es de solo lectura', () => {
  it.each(['post', 'put', 'patch', 'delete'] as const)(
    '%s sobre /api/public devuelve 405',
    async (metodo) => {
      const res = await request(app)[metodo]('/api/public/research')

      expect(res.status).toBe(405)
      expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED')
    },
  )

  it('anuncia los metodos permitidos en la cabecera Allow', async () => {
    const res = await request(app).post('/api/public/research')
    expect(res.headers.allow).toBe('GET, HEAD, OPTIONS')
  })

  it('GET sigue pasando', async () => {
    // Lo que se comprueba es que readOnly NO bloquea la lectura. El codigo concreto
    // depende de si la ruta existe y de si hay base de datos detras, asi que la
    // afirmacion se ata solo al invariante: nunca 405.
    const res = await request(app).get('/api/public/research')
    expect(res.status).not.toBe(405)
  })
})

// Plan seccion 3: requireAdmin se monta sobre el router entero, de modo que una ruta
// nueva nace protegida. Estos tests fallarian si alguien lo moviera a rutas sueltas.
describe('la API administrativa exige sesion', () => {
  it.each([
    ['get', '/api/admin/works'],
    ['post', '/api/admin/works'],
    ['get', '/api/admin/ruta-que-no-existe-todavia'],
  ] as const)('%s %s sin sesion devuelve 401', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta)

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('una ruta inexistente responde 401, no 404: no revela que endpoints existen', async () => {
    const res = await request(app).get('/api/admin/inventado')
    expect(res.status).toBe(401)
  })
})

describe('readiness', () => {
  it('devuelve 200 cuando la base de datos responde', async () => {
    const res = await request(app).get('/health/ready')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ status: 'ready', database: true })
  })

  it('devuelve 503 cuando la base de datos no responde', async () => {
    const caido = createApp({
      ...buildContainer(),
      sessionReader: { getAuthenticatedUser: () => Promise.resolve(null) },
      checkDatabase: () => Promise.resolve(false),
    })

    const res = await request(caido).get('/health/ready')

    expect(res.status).toBe(503)
    expect(res.body.data).toEqual({ status: 'not-ready', database: false })
  })
})

// PERF-004: cabeceras de cache en el contenido publico.
describe('cache del contenido publico', () => {
  it('las GET publicas declaran Cache-Control', async () => {
    const res = await request(app).get('/api/public/research')

    expect(res.headers['cache-control']).toContain('public')
    expect(res.headers['cache-control']).toContain('must-revalidate')
  })

  it('Express genera ETag, asi que un 304 es posible', async () => {
    const res = await request(app).get('/health')
    expect(res.headers.etag).toBeTruthy()
  })

  it('las rutas administrativas NO se cachean', async () => {
    const res = await request(app).get('/api/admin/works')
    expect(res.headers['cache-control']).toBeUndefined()
  })
})

// El sitio publico puede vivir en otro origen que la API. Sin esto, el navegador
// descarga la imagen y despues se niega a pintarla.
describe('incrustacion del contenido publico', () => {
  it('lo publico se puede incrustar desde otro origen', async () => {
    const res = await request(app).get('/api/public/research')
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin')
  })

  it('lo administrativo sigue siendo del mismo origen', async () => {
    const res = await request(app).get('/api/admin/works')
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin')
  })
})

// El panel hace decenas de peticiones por minuto y quien lee la web hace cientos,
// contando archivos. Con un solo numero, o el panel va sobrado o los visitantes se
// quedan sin imagenes.
describe('limites de peticiones', () => {
  it('lo publico y lo administrativo cuentan por separado', async () => {
    const publico = await request(app).get('/api/public/research')
    const administrativo = await request(app).get('/api/admin/works')

    expect(publico.headers['ratelimit-policy']).toBeDefined()
    expect(administrativo.headers['ratelimit-policy']).toBeDefined()
    expect(publico.headers['ratelimit-policy']).not.toBe(administrativo.headers['ratelimit-policy'])
  })

  it('el limite publico es mas holgado que el del panel', async () => {
    const cuota = (politica: string) => Number(/q=(\d+)/.exec(politica)?.[1] ?? 0)

    const publico = await request(app).get('/api/public/research')
    const administrativo = await request(app).get('/api/admin/works')

    expect(cuota(publico.headers['ratelimit-policy'] as string)).toBeGreaterThan(
      cuota(administrativo.headers['ratelimit-policy'] as string),
    )
  })
})

describe('openapi', () => {
  it('sirve un documento 3.1 con el health registrado', async () => {
    const res = await request(app).get('/openapi.json')

    expect(res.status).toBe(200)
    expect(res.body.openapi).toBe('3.1.0')
    expect(res.body.paths).toHaveProperty('/health')
  })

  it('documenta los endpoints publicos y administrativos de las siete fases', () => {
    // Si una fase anade rutas sin registrarlas, la documentacion de NFR-003 miente.
    return request(app)
      .get('/openapi.json')
      .then((res) => {
        expect(Object.keys(res.body.paths as Record<string, unknown>)).toEqual(
          expect.arrayContaining([
            '/health',
            '/api/public/home',
            '/api/public/site',
            '/api/public/profile',
            '/api/public/research',
            '/api/public/teaching',
            '/api/public/media/{id}',
            '/api/admin/media/upload',
            '/api/admin/works/{id}/publish',
            '/api/admin/course-offerings/{id}/publish',
            '/api/admin/dashboard',
          ]),
        )
      })
  })
})
