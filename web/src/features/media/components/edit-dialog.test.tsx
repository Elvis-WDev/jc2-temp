import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { type MediaAsset } from '../api'
import { EditMediaDialog } from './edit-dialog'

const updateMediaMetadata = vi.fn()

// Se reemplaza el modulo entero, no se extiende el real: cargar el original dentro de
// un mock izado deja el modulo a medias y el fallo aparece lejos, como un React nulo.
vi.mock('../api', () => ({
  updateMediaMetadata: (id: string, input: unknown) =>
    updateMediaMetadata(id, input),
  formatFileSize: (bytes: number) => `${String(bytes)} B`,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const PDF: MediaAsset = {
  id: 'media-1',
  originalFilename: 'articulo.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  checksumSha256: null,
  altText: null,
  caption: 'Version aceptada',
  credit: null,
  isPublic: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const IMAGEN: MediaAsset = {
  ...PDF,
  id: 'media-2',
  originalFilename: 'retrato.png',
  mimeType: 'image/png',
  altText: 'Retrato sobre fondo claro',
}

async function abrir(asset: MediaAsset) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <EditMediaDialog open onOpenChange={vi.fn()} asset={asset} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  updateMediaMetadata.mockResolvedValue(PDF)
})

describe('la ficha se ajusta al tipo de archivo', () => {
  it('pide describir la imagen cuando es una imagen', async () => {
    const { getByLabelText } = await abrir(IMAGEN)

    await expect
      .element(getByLabelText('Image description'))
      .toHaveValue('Retrato sobre fondo claro')
  })

  it('no la pide en un PDF, donde no significa nada', async () => {
    const { getByLabelText } = await abrir(PDF)

    expect(getByLabelText('Image description').query()).toBeNull()
  })
})

describe('al guardar', () => {
  it('envia lo editado y deja vacios como nulos', async () => {
    const { getByLabelText, getByRole } = await abrir(PDF)

    await userEvent.fill(getByLabelText('Credit'), 'Revista X')
    await userEvent.click(getByRole('button', { name: 'Save' }))

    expect(updateMediaMetadata).toHaveBeenCalledWith('media-1', {
      // Sin tocar: se conserva. Vacio: se manda null, no cadena vacia.
      altText: null,
      caption: 'Version aceptada',
      credit: 'Revista X',
      isPublic: false,
    })
  })

  it('el interruptor de visibilidad dice que consecuencia tiene', async () => {
    const { getByLabelText, getByText } = await abrir(PDF)

    // El aviso dice la regla completa: marcarlo no basta, tiene que colgar de algo
    // publicado para que se descargue desde la web.
    await expect
      .element(getByText(/will not be downloadable from the site/))
      .toBeInTheDocument()

    await userEvent.click(getByLabelText('Visible on the site'))

    await expect
      .element(getByText(/as soon as you use it in something published/))
      .toBeInTheDocument()
  })

  it('avisa de que el archivo en si no se sustituye aqui', async () => {
    const { getByText } = await abrir(PDF)

    await expect
      .element(getByText(/The file does not change/))
      .toBeInTheDocument()
  })
})
