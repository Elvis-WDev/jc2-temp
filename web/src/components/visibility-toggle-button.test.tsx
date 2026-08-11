import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { VisibilityToggleButton } from './visibility-toggle-button'

/**
 * El fallo que estas pruebas vigilan es el que tenia el panel antes: ocultar algo lo
 * dejaba fuera para siempre porque no existia la accion contraria.
 */

describe('cuando algo esta visible', () => {
  it('el boton oculta, y pasa por la confirmacion', async () => {
    const onHide = vi.fn()
    const onShow = vi.fn()
    const { getByRole } = await render(
      <VisibilityToggleButton
        isActive
        name='UNSW'
        onHide={onHide}
        onShow={onShow}
      />
    )

    await userEvent.click(getByRole('button', { name: 'Ocultar: UNSW' }))

    expect(onHide).toHaveBeenCalledOnce()
    expect(onShow).not.toHaveBeenCalled()
  })
})

describe('cuando algo esta oculto', () => {
  it('el mismo boton lo vuelve a mostrar, en vez de quedarse apagado', async () => {
    const onHide = vi.fn()
    const onShow = vi.fn()
    const { getByRole } = await render(
      <VisibilityToggleButton
        isActive={false}
        name='UNSW'
        onHide={onHide}
        onShow={onShow}
      />
    )

    const boton = getByRole('button', { name: 'Mostrar: UNSW' })
    await expect.element(boton).toBeEnabled()

    await userEvent.click(boton)

    expect(onShow).toHaveBeenCalledOnce()
    expect(onHide).not.toHaveBeenCalled()
  })
})

describe('el nombre accesible', () => {
  it('dice sobre que actua, porque en una tabla hay uno por fila', async () => {
    const { getByRole } = await render(
      <>
        <VisibilityToggleButton
          isActive
          name='Journal Article'
          onHide={vi.fn()}
          onShow={vi.fn()}
        />
        <VisibilityToggleButton
          isActive
          name='Working Paper'
          onHide={vi.fn()}
          onShow={vi.fn()}
        />
      </>
    )

    await expect
      .element(getByRole('button', { name: 'Ocultar: Journal Article' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: 'Ocultar: Working Paper' }))
      .toBeInTheDocument()
  })
})
