import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { errorHandler } from './errorHandler.js'
import { validate, validated } from './validate.js'

/**
 * Un campo que el endpoint no declara se rechaza, no se ignora.
 *
 * Antes se descartaba en silencio: `PATCH /works/:id` con `isFeatured` respondia 200 sin
 * guardar nada, y quien llamaba se quedaba creyendo que habia funcionado.
 */
function app(esquema: z.ZodType) {
  const aplicacion = express()
  aplicacion.use(express.json())
  aplicacion.post('/prueba', validate({ body: esquema }), (req, res) => {
    res.json({ data: validated<unknown, unknown, unknown>(req).body })
  })
  aplicacion.use(errorHandler)
  return aplicacion
}

const cuerpo = z.object({ titulo: z.string(), nota: z.string().optional() })

describe('campos no declarados en el cuerpo', () => {
  it('lo declarado pasa', async () => {
    const res = await request(app(cuerpo)).post('/prueba').send({ titulo: 'Hola', nota: 'x' })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ titulo: 'Hola', nota: 'x' })
  })

  it('un campo de mas se rechaza y se dice cual', async () => {
    const res = await request(app(cuerpo))
      .post('/prueba')
      .send({ titulo: 'Hola', isFeatured: true })

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('UNKNOWN_FIELDS')
    expect(res.body.error.fields).toHaveProperty('isFeatured')
  })

  it('omitir un opcional sigue valiendo', async () => {
    const res = await request(app(cuerpo)).post('/prueba').send({ titulo: 'Hola' })

    expect(res.status).toBe(200)
  })

  it('un campo con valor por defecto no cuenta como sobrante', async () => {
    const conDefecto = z.object({ titulo: z.string(), orden: z.number().default(0) })
    const res = await request(app(conDefecto)).post('/prueba').send({ titulo: 'Hola', orden: 3 })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ titulo: 'Hola', orden: 3 })
  })

  it('una fecha que el esquema convierte a Date no se toma por sobrante', async () => {
    // Las transformaciones de los cuerpos son de campo, no de objeto: la clave sigue ahi.
    const conFecha = z.object({
      titulo: z.string(),
      desde: z.iso.date().transform((valor) => new Date(valor)),
    })
    const res = await request(app(conFecha))
      .post('/prueba')
      .send({ titulo: 'Hola', desde: '2026-01-15' })

    expect(res.status).toBe(200)
  })

  it('el error de validacion de siempre sigue llegando', async () => {
    const res = await request(app(cuerpo)).post('/prueba').send({ titulo: 42 })

    expect(res.status).toBe(422)
    expect(res.body.error.fields).toHaveProperty('titulo')
  })
})
