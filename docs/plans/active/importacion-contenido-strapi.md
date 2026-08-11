# Importacion del contenido de Strapi

## Goal

Cargar en la plataforma todo lo exportado del sistema anterior (`contenido.md`) para ver
el sitio con contenido real: 16 publicaciones, 10 personas, 6 revistas, 2 instituciones,
3 cursos, 5 eventos y los textos de las cuatro paginas.

## Como se ejecuta

```
python3 api/scripts/importar-contenido.py --dry-run   # dice que haria, sin escribir
python3 api/scripts/importar-contenido.py             # importa
```

El script entra por la API, no por la base de datos, para pasar por las mismas reglas que
el panel: RN-001 (publicar es la unica puerta a lo publico), RN-002 (autor obligatorio),
RN-005 (el curso se publica antes que su edicion), RN-009 (normalizacion del DOI) y la
generacion de identificadores estables.

Es **idempotente**: cada entidad se busca por su clave natural —nombre, titulo, codigo—
antes de escribir, asi que volver a ejecutarlo actualiza en vez de duplicar. Se ha
ejecutado cuatro veces seguidas y a partir de la segunda no crea nada.

El panel admite 120 peticiones por minuto y una importacion completa pasa de doscientas.
El script espera a la ventana siguiente cuando choca con el limite, en lugar de subirlo.

## Decisions

Lo que el volcado no decia y hubo que decidir. Todo esto se cambia desde el panel.

- **La fecha `2025-10-21` de cinco trabajos se descarta.** Es la marca que Strapi puso al
  reeditar un lote entero, no una fecha de publicacion: cinco articulos de 2016 a 2025 no
  salieron el mismo dia. En esos cinco manda el ano de la revista y la fecha queda vacia.
- **El volumen de la revista solo se copia si los anos coinciden.** El volcado guardaba un
  volumen por ficha de revista, y varias fichas reunen trabajos de anos distintos: copiarlo
  a ciegas habria puesto el volumen 160 de 2015 en un articulo de 2013.
- **Los 16 trabajos se publican.** En el sistema anterior no habia borradores: todo lo
  exportado estaba visible en la web.
- **Estados academicos.** "Work in progress" y "In Progress" eran el mismo estado escrito
  de dos formas; se unifican en `work_in_progress`. Se crea `rejected`, que el volcado usaba
  y aqui no existia.
- **Los catalogos pasan al idioma del sitio.** Venian sembrados en castellano y todo el
  contenido esta en ingles, con `defaultLocale = en`: sin esto la ficha de un congreso
  escrito en ingles se etiquetaba "Congreso". Son 51 terminos, uno por concepto, porque la
  plataforma no es bilingue.
- **Los tres cursos se destacan en la portada.** El volcado no traia marca de portada para
  cursos —el sistema anterior no tenia ese bloque— y son exactamente tres.
- **Los dos cursos sin instancia reciben una edicion sin fechas.** Aqui un curso se ve a
  traves de donde se imparte; sin edicion no apareceria en la web. Como la edicion es
  inventada, queda marcada como no activa, y por eso esos dos cursos se muestran como
  historicos. Si se siguen impartiendo, basta activar su edicion en el panel.
- **El resumen de cada evento es la primera frase de su cuerpo.** El volcado no traia
  resumen y la tarjeta de la portada necesita uno. Se corta por el punto en vez de
  redactar texto que el autor no escribio.
- **El nombre de los coautores va partido en nombre y apellido.** El volcado solo traia el
  nombre completo, y la cita y el BibTeX se construyen a partir del apellido: sin partirlo
  la referencia salia como "Carbajal, J. C., & Jeffrey Ely".
- **El factor de impacto va en las notas de la revista.** La ficha guarda `citeScore` y un
  `ranking` de texto para escalas tipo Q1 o A*; el factor de impacto no tiene campo propio
  y meterlo en `ranking` lo disfrazaria de otra escala.

## Lo que no se importa

- **Las imagenes y los PDF.** El volcado solo lista nombres de fichero
  (`unnamed (5).jpg`, `intermediate-microeconomics.jpg`, `blob.png`); los ficheros no
  venian. Sin ellos no hay retrato, ni logotipos, ni portadas de evento, ni PDF
  descargables. Las tarjetas de evento pintan una banda con el motivo en su lugar.
- **`image_cite`,** el credito de cada fotografia: sin la fotografia no hay nada que
  acreditar.
- **`documentId`,** el identificador interno de Strapi. Aqui cada entidad tiene el suyo.

## Verification

- `python3 /tmp/verifica-contenido.py` — 59 comprobaciones contra `/api/public/*`, en
  verde: los recuentos por tipo, que ninguna ficha ensene un codigo interno, que los DOI
  quedan normalizados, que ninguna publicacion arrastra la fecha del volcado, que la cita
  y el BibTeX se generan con los dos apellidos, y que el sitemap lista 16 + 5 + 3 URL.
- Capturas de las siete paginas en escritorio y de la portada en movil, sin errores de red
  ni de consola y sin desbordamiento horizontal.
- `api`: 270 tests. `web`: 190 tests.

## Lo que la importacion dejo al descubierto

- **La pagina de eventos ignoraba su contenido de pagina.** Nacio con el titulo fijo
  "Eventos" porque entonces `page_content` solo tenia tres filas; la migracion
  `20260811170000_page_sections` creo la fila `events` y el panel llevaba desde entonces
  ofreciendo editar un titulo y una entradilla que nadie leia. Corregido: ahora usa el
  mismo patron que Research y Docencia.
- **El interfaz del sitio estaba en castellano y el contenido en ingles.** El menu, los
  rotulos ("Publicaciones seleccionadas", "Proximos eventos", "con X y Z", "Autoria unica")
  y las fechas largas se generaban en castellano. **Resuelto despues**: toda la
  plataforma —sitio publico y panel— esta ahora en ingles. Ver
  [`docs/architecture/idioma.md`](../../architecture/idioma.md).
- **La portada muestra un solo evento.** Solo hay una edicion futura del festival y el
  bloque pide proximos antes que pasados, asi que la rejilla de tres columnas queda con una
  tarjeta. Cambiarlo significa decidir que hacer con el titulo "Proximos eventos".
- **`localStorage` en las pruebas del navegador.** `auth-store.test.ts` exigia un
  `localStorage` vacio y la propia interfaz de Vitest guarda ahi sus preferencias. Ahora
  compara antes contra despues, que es lo que la prueba queria decir.
