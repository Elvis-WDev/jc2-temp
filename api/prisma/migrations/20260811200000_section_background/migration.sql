-- Imagen de fondo por seccion.
--
-- Hasta ahora el fondo de cada banda era un zigzag incrustado en la hoja de estilos:
-- no habia ninguna imagen que cambiar. Se pidio poder poner una desde el panel, por
-- seccion, y `page_sections` ya tenia una fila por bloque con su interruptor: el fondo
-- va justo al lado.
--
-- `background_overlay` es la capa oscura que se pinta encima, de 0 a 100. Sin ella una
-- fotografia clara dejaria el texto por debajo del contraste AA. 45 es el punto en que
-- el texto claro del sitio se lee sobre casi cualquier foto; se puede subir o bajar por
-- seccion, pero no desaparece del todo por accidente: para quitar el oscurecimiento hay
-- que ponerlo a 0 a proposito.
--
-- RESTRICT y no CASCADE en la clave foranea, igual que el resto de imagenes del sitio:
-- borrar un archivo no debe vaciar en silencio el fondo de una seccion. El caso se
-- detecta antes, al contar referencias, y se explica en el panel.
--
-- Aditiva: dos columnas anulables con valor por defecto. Ninguna seccion cambia.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

ALTER TABLE "page_sections"
  ADD COLUMN "background_media_id" UUID,
  ADD COLUMN "background_overlay" INTEGER NOT NULL DEFAULT 45;

ALTER TABLE "page_sections"
  ADD CONSTRAINT "page_sections_background_overlay_check"
  CHECK ("background_overlay" >= 0 AND "background_overlay" <= 100);

ALTER TABLE "page_sections"
  ADD CONSTRAINT "page_sections_background_media_id_fkey"
  FOREIGN KEY ("background_media_id") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Solo se consulta para las secciones que tienen fondo, que seran pocas.
CREATE INDEX "page_sections_background_media_id_idx"
  ON "page_sections"("background_media_id")
  WHERE "background_media_id" IS NOT NULL;

COMMIT;
