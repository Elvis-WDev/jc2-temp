-- El carrusel de la portada.
--
-- Una seleccion propia, aparte de los destacados: se pidio poder decidir por separado
-- que encabeza la portada y que sale en la lista de debajo. Un trabajo puede estar en
-- las dos, en una o en ninguna.
--
-- Aditiva: dos columnas con valor por defecto. Ningun trabajo cambia.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

ALTER TABLE "works"
    ADD COLUMN "is_carousel" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "carousel_order" INTEGER;

-- El mismo indice que ya existe para los destacados: la portada los pide asi.
CREATE INDEX "works_is_carousel_carousel_order_idx"
    ON "works"("is_carousel", "carousel_order");

COMMIT;
