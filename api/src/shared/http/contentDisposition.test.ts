import { describe, expect, it } from 'vitest'
import { sanitizeDownloadFilename } from './contentDisposition.js'

const NULO = String.fromCharCode(0)
const CR = String.fromCharCode(13)
const LF = String.fromCharCode(10)

describe('sanitizeDownloadFilename', () => {
  it('conserva un nombre normal', () => {
    expect(sanitizeDownloadFilename('Paper final.pdf')).toBe('Paper final.pdf')
  })

  it('convierte separadores de ruta para no sugerir ubicaciones del servidor', () => {
    expect(sanitizeDownloadFilename('../../etc/passwd')).toBe('etc_passwd')
  })

  it('elimina CR y LF, que permitirian inyectar una cabecera HTTP', () => {
    expect(sanitizeDownloadFilename(`informe${CR}${LF}X-Evil: 1.pdf`)).toBe('informeX-Evil: 1.pdf')
  })

  it('devuelve un nombre por defecto cuando no queda nada utilizable', () => {
    expect(sanitizeDownloadFilename('...')).toBe('download')
    expect(sanitizeDownloadFilename(NULO)).toBe('download')
  })

  it('acota la longitud', () => {
    expect(sanitizeDownloadFilename('a'.repeat(500))).toHaveLength(200)
  })
})
