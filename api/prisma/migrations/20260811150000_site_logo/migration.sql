-- Emblema del sitio publico.
--
-- La cabecera de la web principal lleva un logotipo. Hasta ahora site_settings solo
-- guardaba la imagen para compartir en redes (og_image), que es otra cosa: aquella se
-- ve fuera del sitio y esta se ve dentro, en todas las paginas.
--
-- Aditiva y opcional: sin logotipo, la cabecera muestra el nombre del sitio.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

ALTER TABLE "site_settings" ADD COLUMN "logo_media_id" UUID;

-- RESTRICT, igual que og_image: borrar un archivo que el sitio esta usando tiene que
-- fallar de forma visible, no dejar la cabecera rota en silencio.
ALTER TABLE "site_settings"
    ADD CONSTRAINT "site_settings_logo_media_id_fkey"
    FOREIGN KEY ("logo_media_id") REFERENCES "media_assets"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
