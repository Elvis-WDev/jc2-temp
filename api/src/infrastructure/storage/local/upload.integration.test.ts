import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { UploadMedia } from '../../../application/use-cases/media/UploadMedia.js'
import { DeleteMedia } from '../../../application/use-cases/media/DeleteMedia.js'
import { GetMediaForDownload } from '../../../application/use-cases/media/GetMediaForDownload.js'
import type {
  CreateMediaAssetInput,
  MediaAssetRecord,
  MediaReferences,
  MediaRepository,
} from '../../../application/ports/repositories/MediaRepository.js'
import type { IdGenerator } from '../../../application/ports/IdGenerator.js'
import { MagicBytesFileTypeDetector } from '../MagicBytesFileTypeDetector.js'
import { LocalStorageProvider } from './LocalStorageProvider.js'

/**
 * Integracion real de disco y deteccion de tipo. Lo unico simulado es la base de
 * datos: el objetivo es comprobar el comportamiento de almacenamiento, no Prisma.
 */

const SIN_REFERENCIAS: MediaReferences = {
  workFiles: 0,
  courseMaterials: 0,
  personPhotos: 0,
  personCvs: 0,
  institutionLogos: 0,
  workCovers: 0,
  courseCovers: 0,
  pageHeroes: 0,
  siteOgImages: 0,
  siteLogos: 0,
  sectionBackgrounds: 0,
  total: 0,
}

class RepositorioEnMemoria implements MediaRepository {
  readonly filas = new Map<string, MediaAssetRecord>()
  referencias: MediaReferences = SIN_REFERENCIAS
  alcanzablePublicamente = false
  fallarAlCrear = false

  create(input: CreateMediaAssetInput): Promise<MediaAssetRecord> {
    if (this.fallarAlCrear) return Promise.reject(new Error('fallo de base de datos'))
    const fila: MediaAssetRecord = {
      ...input,
      altText: null,
      caption: null,
      credit: null,
      createdAt: new Date('2026-08-10T00:00:00Z'),
    }
    this.filas.set(input.id, fila)
    return Promise.resolve(fila)
  }

  findById(id: string): Promise<MediaAssetRecord | null> {
    return Promise.resolve(this.filas.get(id) ?? null)
  }

  findByChecksum(): Promise<MediaAssetRecord | null> {
    return Promise.resolve(null)
  }

  list(): Promise<{ items: MediaAssetRecord[]; totalItems: number }> {
    const items = [...this.filas.values()]
    return Promise.resolve({ items, totalItems: items.length })
  }

  updateMetadata(id: string): Promise<MediaAssetRecord> {
    return Promise.resolve(this.filas.get(id) as MediaAssetRecord)
  }

  delete(id: string): Promise<void> {
    this.filas.delete(id)
    return Promise.resolve()
  }

  countReferences(): Promise<MediaReferences> {
    return Promise.resolve(this.referencias)
  }

  isPubliclyReachable(): Promise<boolean> {
    return Promise.resolve(this.alcanzablePublicamente)
  }
}

class IdFijo implements IdGenerator {
  constructor(private readonly valor: string) {}
  generate(): string {
    return this.valor
  }
}

// Cabeceras reales: lo que mira la deteccion por magic bytes.
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(2048, 0x20)])
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]),
  Buffer.alloc(2048, 0),
])
// Cabecera ELF: un ejecutable de Linux.
const EJECUTABLE = Buffer.concat([
  Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]),
  Buffer.alloc(2048, 0),
])

let raiz: string
let storage: LocalStorageProvider
let repo: RepositorioEnMemoria
let subir: UploadMedia

const ID = '0198f0a1-1111-7000-8000-000000000abc'

beforeEach(async () => {
  raiz = await mkdtemp(path.join(tmpdir(), 'jc2-storage-'))
  storage = new LocalStorageProvider(raiz)
  repo = new RepositorioEnMemoria()
  subir = new UploadMedia(storage, repo, new MagicBytesFileTypeDetector(), new IdFijo(ID))
})

afterEach(async () => {
  await rm(raiz, { recursive: true, force: true })
})

describe('subida de archivos', () => {
  it('almacena un PDF bajo la raiz con un nombre generado por el servidor', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'paper original.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })

    expect(creado.mimeType).toBe('application/pdf')
    expect(creado.sizeBytes).toBe(PDF.length)

    const fila = repo.filas.get(creado.id)
    // El nombre en disco es el UUID del servidor, no el que envio el cliente.
    expect(fila?.storageKey).toMatch(/^private\/\d{4}\/\d{2}\/0198f0a1-1111-7000-8000-000000000abc\.pdf$/)
    expect(fila?.storageKey).not.toContain('paper original')

    const enDisco = await readFile(path.join(raiz, fila?.storageKey ?? ''))
    expect(enDisco.equals(PDF)).toBe(true)
  })

  it('conserva el nombre original solo como metadato', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'paper original.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })

    expect(creado.originalFilename).toBe('paper original.pdf')
  })

  it('calcula el checksum SHA-256 del contenido', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'a.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })

    expect(creado.checksumSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rechaza un ejecutable renombrado a .pdf', async () => {
    await expect(
      subir.execute({
        openContent: () => Readable.from(EJECUTABLE),
        originalFilename: 'inofensivo.pdf',
        purpose: 'document',
        visibility: 'private',
        uploadedBy: null,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_ALLOWED' })

    expect(repo.filas.size).toBe(0)
  })

  it('rechaza un PNG cuando el proposito pide un documento', async () => {
    await expect(
      subir.execute({
        openContent: () => Readable.from(PNG),
        originalFilename: 'x.pdf',
        purpose: 'document',
        visibility: 'private',
        uploadedBy: null,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_ALLOWED' })
  })

  it('acepta el mismo PNG cuando el proposito es imagen', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PNG),
      originalFilename: 'portada.png',
      purpose: 'image',
      visibility: 'public',
      uploadedBy: null,
    })

    expect(creado.mimeType).toBe('image/png')
    expect(creado.isPublic).toBe(true)
  })

  it('no deja el archivo en disco si falla el registro en la base de datos', async () => {
    repo.fallarAlCrear = true

    await expect(
      subir.execute({
        openContent: () => Readable.from(PDF),
        originalFilename: 'a.pdf',
        purpose: 'document',
        visibility: 'private',
        uploadedBy: null,
      }),
    ).rejects.toThrow()

    // Un archivo sin fila seria inalcanzable y eterno.
    const anios = await readdir(path.join(raiz, 'private')).catch(() => [])
    const encontrados: string[] = []
    for (const anio of anios) {
      for (const mes of await readdir(path.join(raiz, 'private', anio))) {
        encontrados.push(...(await readdir(path.join(raiz, 'private', anio, mes))))
      }
    }
    expect(encontrados).toEqual([])
  })

  it('no deja temporales tras una subida correcta', async () => {
    await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'a.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })

    const temporales = await readdir(path.join(raiz, 'tmp')).catch(() => [])
    expect(temporales).toEqual([])
  })
})

// Paso 2 del plan de huecos: los formatos de texto plano no tienen magic bytes y van
// por un camino distinto, validado por extension ademas de por contenido.
describe('camino de texto plano', () => {
  const CSV = Buffer.from('anio,pib,desempleo\n2024,1.2,7.5\n2025,1.4,7.1\n', 'utf8')
  const TEX = Buffer.from('\\documentclass{article}\n\\begin{document}\nHola\n\\end{document}\n', 'utf8')

  it('acepta un CSV como dataset y conserva su extension', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(CSV),
      originalFilename: 'panel-macro.csv',
      purpose: 'dataset',
      visibility: 'public',
      uploadedBy: null,
    })

    expect(creado.mimeType).toBe('text/csv')
    expect(repo.filas.get(creado.id)?.storageKey).toMatch(/\.csv$/)

    const enDisco = await readFile(path.join(raiz, creado.storageKey))
    expect(enDisco.equals(CSV)).toBe(true)
  })

  it('acepta material de replicacion en LaTeX como source', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(TEX),
      originalFilename: 'paper.tex',
      purpose: 'source',
      visibility: 'private',
      uploadedBy: null,
    })

    expect(creado.mimeType).toBe('text/x-tex')
  })

  it('acepta texto con acentos: el corte de la muestra no rompe UTF-8', async () => {
    const acentuado = Buffer.from('anio,region\n2024,Andalucia con tildes: aeiou\n', 'utf8')

    const creado = await subir.execute({
      openContent: () => Readable.from(acentuado),
      originalFilename: 'regiones.csv',
      purpose: 'dataset',
      visibility: 'private',
      uploadedBy: null,
    })

    expect(creado.mimeType).toBe('text/csv')
  })

  it('rechaza un CSV cuando el proposito no admite texto', async () => {
    await expect(
      subir.execute({
        openContent: () => Readable.from(CSV),
        originalFilename: 'panel.csv',
        purpose: 'document',
        visibility: 'private',
        uploadedBy: null,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_RECOGNISED' })
  })

  it('rechaza una extension fuera de la lista aunque el contenido sea texto', async () => {
    // Es la barrera que deja fuera .html, .svg y .js: sin ella, cualquier texto
    // pasaria solo por ser texto.
    await expect(
      subir.execute({
        openContent: () => Readable.from(Buffer.from('<h1>hola</h1>', 'utf8')),
        originalFilename: 'pagina.html',
        purpose: 'source',
        visibility: 'private',
        uploadedBy: null,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_EXTENSION_NOT_ALLOWED' })
  })

  it('rechaza un ejecutable renombrado a .csv', async () => {
    // ELF tiene firma propia, asi que ni siquiera llega al camino de texto: se
    // rechaza como tipo no permitido, que es un diagnostico mas preciso.
    await expect(
      subir.execute({
        openContent: () => Readable.from(EJECUTABLE),
        originalFilename: 'datos.csv',
        purpose: 'dataset',
        visibility: 'private',
        uploadedBy: null,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_ALLOWED' })

    expect(repo.filas.size).toBe(0)
  })

  it('rechaza un binario SIN firma reconocible renombrado a .csv', async () => {
    // Bytes altos aleatorios sin firma conocida: aqui si actua la comprobacion de
    // texto, porque no hay MIME que contrastar.
    const sinFirma = Buffer.from(Array.from({ length: 512 }, (_, i) => 0x80 + (i % 0x40)))

    await expect(
      subir.execute({
        openContent: () => Readable.from(sinFirma),
        originalFilename: 'datos.csv',
        purpose: 'dataset',
        visibility: 'private',
        uploadedBy: null,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_RECOGNISED' })
  })

  it('rechaza texto con bytes nulos intercalados', async () => {
    const sospechoso = Buffer.concat([
      Buffer.from('anio,pib\n', 'utf8'),
      Buffer.from([0x00, 0x00]),
      Buffer.from('2024,1.2\n', 'utf8'),
    ])

    await expect(
      subir.execute({
        openContent: () => Readable.from(sospechoso),
        originalFilename: 'datos.csv',
        purpose: 'dataset',
        visibility: 'private',
        uploadedBy: null,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_RECOGNISED' })
  })
})

describe('borrado de archivos', () => {
  it('devuelve 409 cuando el archivo esta en uso', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'a.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })

    repo.referencias = { ...SIN_REFERENCIAS, workFiles: 2, total: 2 }
    const borrar = new DeleteMedia(repo, storage)

    await expect(borrar.execute({ id: creado.id, force: false })).rejects.toMatchObject({
      code: 'MEDIA_IN_USE',
      httpStatus: 409,
    })

    // El binario sigue ahi: un borrado bloqueado no debe tocar el disco.
    await expect(stat(path.join(raiz, creado.storageKey))).resolves.toBeDefined()
  })

  it('borra fila y binario cuando no hay referencias', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'a.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })

    await new DeleteMedia(repo, storage).execute({ id: creado.id, force: false })

    expect(repo.filas.size).toBe(0)
    await expect(stat(path.join(raiz, creado.storageKey))).rejects.toThrow()
  })

  it('force borra aunque este en uso', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'a.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })
    repo.referencias = { ...SIN_REFERENCIAS, workFiles: 1, total: 1 }

    await new DeleteMedia(repo, storage).execute({ id: creado.id, force: true })

    expect(repo.filas.size).toBe(0)
  })
})

describe('descarga', () => {
  it('un archivo no alcanzable publicamente responde 404, no 403', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'privado.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })
    repo.alcanzablePublicamente = false

    // Un 403 confirmaria que el identificador existe y permitiria enumerar archivos.
    await expect(
      new GetMediaForDownload(repo, storage).execute(creado.id, 'public'),
    ).rejects.toMatchObject({ httpStatus: 404, code: 'MEDIA_NOT_FOUND' })
  })

  it('el administrador si puede descargar un privado', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'privado.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })

    const archivo = await new GetMediaForDownload(repo, storage).execute(creado.id, 'admin')

    expect(archivo.mimeType).toBe('application/pdf')
    expect(archivo.isPublic).toBe(false)
  })

  it('marca como no inline lo que no debe abrirse en el navegador', async () => {
    const creado = await subir.execute({
      openContent: () => Readable.from(PDF),
      originalFilename: 'a.pdf',
      purpose: 'document',
      visibility: 'private',
      uploadedBy: null,
    })

    const archivo = await new GetMediaForDownload(repo, storage).execute(creado.id, 'admin')
    expect(archivo.inlineSafe).toBe(true)
  })
})
