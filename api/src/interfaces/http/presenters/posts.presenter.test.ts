import { describe, expect, it } from 'vitest'
import type { PostRecord } from '../../../application/ports/repositories/PostRepository.js'
import { toPublicPostDto } from './posts.presenter.js'

const BASE = 'https://example.org'

function post(parcial: Partial<PostRecord> = {}): PostRecord {
  return {
    id: 'p1',
    kind: 'personal',
    title: 'On teaching',
    slug: 'on-teaching',
    summary: 'Short note.',
    contentMarkdown: null,
    imageMediaId: null,
    imageAlt: null,
    editorialStatus: 'published',
    publishedAt: null,
    displayOrder: 3,
    files: [],
    ...parcial,
  }
}

describe('toPublicPostDto', () => {
  it('no deja salir el estado editorial ni el orden interno', () => {
    const dto = toPublicPostDto(post(), BASE)

    expect(dto).not.toHaveProperty('editorialStatus')
    expect(dto).not.toHaveProperty('displayOrder')
    expect(dto).not.toHaveProperty('imageMediaId')
  })

  it('convierte los identificadores de archivo en direcciones', () => {
    const dto = toPublicPostDto(post({ imageMediaId: 'm-1' }), BASE)

    expect(dto.imageUrl).toBe(`${BASE}/api/public/media/m-1`)
  })

  it('calla los adjuntos privados: enumerarlos ya dice que existen', () => {
    const dto = toPublicPostDto(
      post({
        files: [
          {
            mediaId: 'm-pub',
            label: 'Slides',
            sortOrder: 0,
            isPublic: true,
            mimeType: 'application/pdf',
          },
          {
            mediaId: 'm-priv',
            label: 'Draft',
            sortOrder: 1,
            isPublic: false,
            mimeType: 'application/pdf',
          },
        ],
      }),
      BASE,
    )

    expect(dto.files).toEqual([
      { label: 'Slides', url: `${BASE}/api/public/media/m-pub`, mimeType: 'application/pdf' },
    ])
  })

  it('usa el rotulo del catalogo, y el codigo crudo si nadie lo definio', () => {
    expect(toPublicPostDto(post(), BASE, { personal: 'Blog' }).kindLabel).toBe('Blog')
    expect(toPublicPostDto(post(), BASE).kindLabel).toBe('personal')
  })

  it('entrega el cuerpo ya convertido a HTML, no el Markdown', () => {
    const dto = toPublicPostDto(post({ contentMarkdown: '**hola**' }), BASE)

    expect(dto).not.toHaveProperty('contentMarkdown')
    expect(dto.contentHtml).toContain('<strong>hola</strong>')
  })
})

describe('adjuntos que se pueden escuchar', () => {
  it('el tipo del archivo viaja, para que la ficha decida si ofrece reproducirlo', () => {
    const dto = toPublicPostDto(
      post({
        files: [
          {
            mediaId: 'm-audio',
            label: 'La grabacion',
            sortOrder: 0,
            isPublic: true,
            mimeType: 'audio/mpeg',
          },
        ],
      }),
      BASE,
    )

    expect(dto.files[0]?.mimeType).toBe('audio/mpeg')
  })
})
