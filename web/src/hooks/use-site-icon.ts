import { useEffect } from 'react'

/** Marca el icono que pone el sitio, para distinguirlo de los del `index.html`. */
const MARCA_ICONO = 'data-site-icon'

/**
 * El emblema del sitio hace tambien de favicon.
 *
 * `index.html` trae cuatro `link[rel=icon]` de la plantilla, con variantes para tema
 * claro y oscuro. **Se retiran todos** en vez de anadir uno mas: con varios declarados
 * el navegador elige, y el que elija no tiene por que ser el del titular.
 *
 * Sin `type`: el archivo puede ser PNG, JPEG o WebP segun lo que se haya subido, y
 * declarar un tipo que no coincide es peor que no declarar ninguno.
 *
 * Sin emblema no se toca nada y siguen los estaticos, que es mejor que una pestaña sin
 * icono.
 */
export function useSiteIcon(url: string | null): void {
  useEffect(() => {
    if (url === null) return

    for (const icono of document.head.querySelectorAll('link[rel~="icon"]')) {
      icono.remove()
    }

    const enlace = document.createElement('link')
    enlace.rel = 'icon'
    enlace.href = url
    enlace.setAttribute(MARCA_ICONO, '')
    document.head.appendChild(enlace)

    return () => {
      document.head
        .querySelectorAll(`link[${MARCA_ICONO}]`)
        .forEach((icono) => {
          icono.remove()
        })
    }
  }, [url])
}
