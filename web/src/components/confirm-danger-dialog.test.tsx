import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ConfirmDangerDialog } from './confirm-danger-dialog'

/**
 * Lo que se comprueba aqui no es el aspecto del dialogo, sino que la friccion
 * corresponda al riesgo: escribir el nombre solo donde no hay vuelta atras.
 */

function props(extra: Partial<Parameters<typeof ConfirmDangerDialog>[0]> = {}) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    name: 'UNSW',
    title: 'Delete institution',
    description: 'Se borrara de la lista.',
    onConfirm: vi.fn(),
    ...extra,
  }
}

describe('cuando la accion no se puede deshacer', () => {
  it('no ofrece confirmar hasta despues de un primer paso', async () => {
    const { getByRole } = await render(<ConfirmDangerDialog {...props()} />)

    await expect
      .element(getByRole('button', { name: 'Continuar' }))
      .toBeInTheDocument()
    expect(getByRole('textbox').query()).toBeNull()
  })

  it('exige escribir el nombre exacto', async () => {
    const onConfirm = vi.fn()
    const { getByRole } = await render(
      <ConfirmDangerDialog {...props({ onConfirm })} />
    )

    await userEvent.click(getByRole('button', { name: 'Continuar' }))

    const confirmar = getByRole('button', { name: 'Delete' })
    await expect.element(confirmar).toBeDisabled()

    await userEvent.fill(getByRole('textbox'), 'UNS')
    await expect.element(confirmar).toBeDisabled()

    await userEvent.fill(getByRole('textbox'), 'UNSW')
    await expect.element(confirmar).toBeEnabled()

    await userEvent.click(confirmar)
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})

describe('cuando la accion se puede deshacer', () => {
  it('confirma en un solo paso, sin escribir nada', async () => {
    const onConfirm = vi.fn()
    const { getByRole } = await render(
      <ConfirmDangerDialog
        {...props({
          onConfirm,
          requireTypedName: false,
          title: 'Ocultar UNSW',
          confirmText: 'Ocultar',
        })}
      />
    )

    // Ni paso intermedio ni campo que rellenar: la friccion sobra si se deshace.
    expect(getByRole('button', { name: 'Continuar' }).query()).toBeNull()
    expect(getByRole('textbox').query()).toBeNull()

    await userEvent.click(getByRole('button', { name: 'Ocultar' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('sigue explicando que va a pasar', async () => {
    const { getByText } = await render(
      <ConfirmDangerDialog
        {...props({
          requireTypedName: false,
          description: 'Dejara de poder elegirse al crear cursos.',
          warning: 'You can show it again whenever you want.',
          confirmText: 'Ocultar',
        })}
      />
    )

    await expect
      .element(getByText('Dejara de poder elegirse al crear cursos.'))
      .toBeInTheDocument()
    await expect
      .element(getByText('You can show it again whenever you want.'))
      .toBeInTheDocument()
  })
})

describe('mientras la peticion esta en curso', () => {
  it('no deja confirmar dos veces', async () => {
    const { getByRole } = await render(
      <ConfirmDangerDialog
        {...props({
          requireTypedName: false,
          isLoading: true,
          confirmText: 'Ocultar',
        })}
      />
    )

    await expect
      .element(getByRole('button', { name: 'Ocultar' }))
      .toBeDisabled()
    await expect.element(getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
