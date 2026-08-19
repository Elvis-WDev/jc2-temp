/**
 * La ilustracion que acompana a la cabecera de una pagina.
 *
 * Se elige en Contenido de paginas y la usan las cabeceras que llevan texto a un lado e
 * imagen al otro. Vive aparte porque eran dos copias identicas —Research y Teaching— y
 * cualquier ajuste habia que hacerlo dos veces y acordarse de las dos.
 *
 * Sin sombra: la cabecera ya es una banda con su propio color, y una sombra ahi hace
 * que la imagen parezca pegada encima en lugar de formar parte de ella.
 *
 * `self-center` propio y no heredado de la rejilla: el texto de la cabecera se alinea
 * abajo en unas paginas y al centro en otras, y la ilustracion se centra siempre.
 */
export function ImagenDeCabecera({
  url,
  alt,
}: {
  url: string
  /**
   * Sin descripcion escrita va como decorativa: un `alt` inventado le cuenta a un lector
   * de pantalla algo que nadie ha comprobado.
   */
  alt: string | null
}) {
  return (
    <div className='flex md:col-span-5 md:justify-end md:self-center'>
      <img src={url} alt={alt ?? ''} className='w-full rounded-site' />
    </div>
  )
}
