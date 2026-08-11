import { useSectionBackground } from '../use-section-background'

/**
 * El fondo de una banda, elegido desde el panel.
 *
 * Cada seccion de `page_sections` puede llevar una imagen. Sin imagen no se pinta nada:
 * la seccion se queda con su color liso, que es como esta el sitio de fabrica.
 *
 * **Siempre va con una capa oscura encima.** Una fotografia clara detras de texto claro
 * lo deja por debajo del contraste que exige AA, y quien sube la foto no tiene por que
 * saberlo. El porcentaje se ajusta por seccion desde el panel; el valor de partida, 45,
 * es el punto en que el texto del sitio se lee sobre casi cualquier imagen.
 *
 * La imagen es decorativa: va como `background-image` de un elemento `aria-hidden`, sin
 * texto alternativo. Describir un fondo a quien usa un lector de pantalla solo anade
 * ruido entre el titular y el contenido.
 *
 * Debajo de la imagen va un color solido. Hace falta para las imagenes con
 * transparencia —una cenefa recortada, un logotipo sobre nada—: sin base, lo que se ve
 * por los huecos es el fondo claro de la pagina, y el texto de la banda, que con imagen
 * pasa a ser claro, deja de leerse. Con base, la parte transparente queda oscura y el
 * contraste se sostiene sea cual sea la imagen.
 *
 * No envuelve al contenido: se pone al lado, en posicion absoluta, para que quien la usa
 * no tenga que reordenar su maquetacion. El contenido necesita su propio `relative` o
 * `z-10`, igual que ya hacia con la textura que habia antes.
 */
export function SectionBackground({ clave }: { clave: string }) {
  const fondo = useSectionBackground(clave)
  if (fondo === null) return null

  return (
    <div aria-hidden className='pointer-events-none absolute inset-0 z-0 bg-site-primary'>
      <div
        className='size-full bg-cover bg-center'
        style={{ backgroundImage: `url(${fondo.url})` }}
      />
      <div
        className='absolute inset-0 bg-site-primary'
        style={{ opacity: fondo.overlay / 100 }}
      />
    </div>
  )
}
