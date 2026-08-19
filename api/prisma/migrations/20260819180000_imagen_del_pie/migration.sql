-- Imagen de la primera columna del pie del sitio publico.
--
-- Aparte del emblema de la cabecera a proposito: la cabecera pide una marca pequena y
-- el pie admite otra cosa, como el escudo de la institucion. Compartir columna obligaria
-- a que fueran la misma.
--
-- Puramente aditiva: una columna opcional. Sin ella puesta, el pie se pinta como hasta
-- ahora.
--
-- ESCRITA A MANO. Ver docs/architecture/migraciones.md: al generar una migracion, Prisma
-- propone ademas borrar las claves foraneas de RN-006, la unica de `departments` y el
-- indice de busqueda. Esas lineas nunca se incluyen.

ALTER TABLE "site_settings"
  ADD COLUMN "footer_media_id" UUID;

ALTER TABLE "site_settings"
  ADD CONSTRAINT "site_settings_footer_media_id_fkey"
  FOREIGN KEY ("footer_media_id") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
