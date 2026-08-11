import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { type PublicEvent } from '../api'
import { EventButton, EventCard } from './event-card'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <a className={className}>{children}</a>,
}))

const EVENTO: PublicEvent = {
  id: 'e1',
  slug: 'seminario-marzo',
  title: 'Seminario de economia conductual',
  type: 'seminar',
  typeLabel: 'Seminario',
  summary: 'Una tarde sobre sesgos cognitivos.',
  contentHtml: null,
  startsAt: '2026-03-12T10:00:00.000Z',
  endsAt: null,
  location: 'Aula Magna',
  organizer: 'Departamento de Economia',
  imageUrl: null,
  imageAlt: null,
  button: {
    label: 'Inscribirse',
    url: 'https://ejemplo.edu/inscripcion',
    color: null,
  },
  isMain: false,
  institutions: ['Universidad Nacional'],
}

describe('tarjeta de un evento', () => {
  it('muestra el tipo con su nombre, no con el codigo', async () => {
    const screen = await render(<EventCard event={EVENTO} />)

    // `exact` porque el titulo tambien empieza por "Seminario".
    await expect
      .element(screen.getByText('Seminario', { exact: true }))
      .toBeVisible()
    await expect
      .element(screen.getByText('seminar', { exact: true }))
      .not.toBeInTheDocument()
  })

  it('muestra el lugar y quien organiza', async () => {
    const screen = await render(<EventCard event={EVENTO} />)

    await expect.element(screen.getByText('Aula Magna')).toBeVisible()
    await expect
      .element(
        screen.getByText('Departamento de Economia · Universidad Nacional')
      )
      .toBeVisible()
  })

  it('sin tipo no se pinta un hueco', async () => {
    const screen = await render(
      <EventCard event={{ ...EVENTO, type: null, typeLabel: null }} />
    )

    await expect
      .element(screen.getByText(/Seminario de economia/))
      .toBeVisible()
  })
})

describe('boton propio de un evento', () => {
  it('usa el color del sitio cuando no se eligio ninguno', async () => {
    const screen = await render(<EventButton event={EVENTO} />)
    const boton = screen.getByRole('link', { name: 'Inscribirse' })

    await expect.element(boton).toBeVisible()
    expect((await boton.element()).className).toContain('bg-site-primary')
  })

  it('respeta el color elegido en el panel', async () => {
    const screen = await render(
      <EventButton
        event={{ ...EVENTO, button: { ...EVENTO.button!, color: '#c37754' } }}
      />
    )
    const boton = await screen
      .getByRole('link', { name: 'Inscribirse' })
      .element()

    expect((boton as HTMLElement).style.backgroundColor).toBe(
      'rgb(195, 119, 84)'
    )
  })

  it('sin enlace no hay boton', async () => {
    const screen = await render(
      <EventButton event={{ ...EVENTO, button: null }} />
    )

    await expect.element(screen.getByRole('link')).not.toBeInTheDocument()
  })
})
