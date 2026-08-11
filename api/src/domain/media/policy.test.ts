import { describe, expect, it } from 'vitest'
import { extractExtension, purposeAcceptsText, resolveTextFormat } from './TextFormatPolicy.js'
import { isInlineSafe, maxBytesForPurpose, resolveAllowedType } from './UploadPolicy.js'

const OOXML = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

describe('camino binario: que acepta cada proposito', () => {
  it('acepta PDF y Word como documento', () => {
    expect(resolveAllowedType('document', 'application/pdf')?.extension).toBe('pdf')
    expect(resolveAllowedType('document', OOXML.docx)?.extension).toBe('docx')
  })

  it('acepta PowerPoint y PDF como slides', () => {
    expect(resolveAllowedType('slides', OOXML.pptx)?.extension).toBe('pptx')
    expect(resolveAllowedType('slides', 'application/pdf')?.extension).toBe('pdf')
  })

  it('acepta Excel como dataset', () => {
    expect(resolveAllowedType('dataset', OOXML.xlsx)?.extension).toBe('xlsx')
  })

  it('acepta tar.gz y 7z como archivo comprimido', () => {
    expect(resolveAllowedType('archive', 'application/gzip')?.extension).toBe('gz')
    expect(resolveAllowedType('archive', 'application/x-7z-compressed')?.extension).toBe('7z')
  })

  it('el proposito acota: un PowerPoint no vale como imagen', () => {
    expect(resolveAllowedType('image', OOXML.pptx)).toBeNull()
    expect(resolveAllowedType('document', OOXML.pptx)).toBeNull()
  })

  it('rechaza los formatos Office heredados', () => {
    // .doc, .xls y .ppt son contenedores OLE y file-type los reporta todos igual, sin
    // poder distinguir un documento de una hoja de calculo con macros.
    for (const proposito of ['document', 'slides', 'dataset'] as const) {
      expect(resolveAllowedType(proposito, 'application/x-cfb')).toBeNull()
    }
  })

  it('rechaza SVG en todos los propositos', () => {
    for (const proposito of ['document', 'slides', 'image', 'dataset', 'archive'] as const) {
      expect(resolveAllowedType(proposito, 'image/svg+xml')).toBeNull()
    }
  })
})

describe('que puede mostrarse en el navegador', () => {
  it('solo PDF e imagenes rasterizadas', () => {
    expect(isInlineSafe('application/pdf')).toBe(true)
    expect(isInlineSafe('image/png')).toBe(true)
  })

  it('los documentos ofimaticos y los comprimidos se descargan', () => {
    expect(isInlineSafe(OOXML.docx)).toBe(false)
    expect(isInlineSafe('application/zip')).toBe(false)
  })

  it('ningun formato de texto es inline', () => {
    for (const mime of ['text/csv', 'text/x-tex', 'text/plain', 'text/markdown']) {
      expect(isInlineSafe(mime)).toBe(false)
    }
  })
})

describe('extractExtension', () => {
  it.each([
    ['datos.csv', 'csv'],
    ['Analisis Final.TEX', 'tex'],
    ['replicacion.do', 'do'],
  ])('%s -> %s', (nombre, esperado) => {
    expect(extractExtension(nombre)).toBe(esperado)
  })

  it.each(['sin-extension', '.oculto', 'acaba-en-punto.', 'raro.ex!t'])(
    'devuelve null para %s',
    (nombre) => {
      expect(extractExtension(nombre)).toBeNull()
    },
  )

  it('toma solo el ultimo segmento', () => {
    expect(extractExtension('datos.tar.gz')).toBe('gz')
  })
})

describe('camino de texto', () => {
  it('dataset acepta csv, tsv y json', () => {
    expect(resolveTextFormat('dataset', 'panel.csv')?.mime).toBe('text/csv')
    expect(resolveTextFormat('dataset', 'panel.tsv')?.mime).toBe('text/tab-separated-values')
    expect(resolveTextFormat('dataset', 'panel.json')?.mime).toBe('application/json')
  })

  it('source acepta el material de replicacion habitual en economia', () => {
    for (const nombre of ['paper.tex', 'refs.bib', 'estimacion.do', 'modelo.m', 'limpieza.R']) {
      expect(resolveTextFormat('source', nombre)).not.toBeNull()
    }
  })

  it.each(['pagina.html', 'grafico.svg', 'script.js', 'macro.xlsm'])(
    'rechaza %s aunque su contenido sea texto valido',
    (nombre) => {
      expect(resolveTextFormat('source', nombre)).toBeNull()
      expect(resolveTextFormat('dataset', nombre)).toBeNull()
    },
  )

  it('los propositos binarios no aceptan texto', () => {
    expect(purposeAcceptsText('document')).toBe(false)
    expect(purposeAcceptsText('image')).toBe(false)
    expect(purposeAcceptsText('archive')).toBe(false)
    expect(resolveTextFormat('document', 'notas.txt')).toBeNull()
  })
})

describe('limites de tamano', () => {
  it('el archivo comprimido admite mas que una imagen', () => {
    expect(maxBytesForPurpose('archive')).toBeGreaterThan(maxBytesForPurpose('image'))
  })

  it('el texto tiene un limite bajo', () => {
    expect(maxBytesForPurpose('source')).toBe(5 * 1024 * 1024)
  })
})
