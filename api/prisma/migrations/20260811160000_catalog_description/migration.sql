-- Descripcion en los terminos de catalogo, y un catalogo nuevo para los niveles.
--
-- La pagina publica de Docencia agrupa los cursos por nivel, y cada grupo lleva un
-- titulo y un parrafo que lo explica. Con el nivel como texto libre, ese titulo y ese
-- parrafo tendrian que estar escritos en el codigo, que es justo lo contrario de lo
-- que se pide: que todo lo que se ve en la web se gestione desde el panel.
--
-- La columna sirve para cualquier catalogo, no solo para niveles; los demas la dejan
-- vacia y se comportan igual que antes.
--
-- `courses.level` SIGUE siendo texto libre, sin clave foranea, como el resto de
-- catalogos: un nivel importado que no figure en la lista se muestra igual, en su
-- propio grupo, en vez de rechazarse.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

ALTER TABLE "catalog_terms" ADD COLUMN "description" TEXT;

COMMIT;
