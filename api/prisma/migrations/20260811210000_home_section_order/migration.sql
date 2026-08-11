-- Las lineas de investigacion suben por delante del carrusel en la portada.
--
-- El orden real lo decide el codigo (`features/site/home.tsx`); `sort_order` solo ordena
-- la lista del panel. Si no se cambia aqui, el panel enseña un orden y la web otro, que
-- es peor que no tener orden.
--
-- Va en una migracion y no por la API porque `sort_order` no es un ajuste del titular:
-- describe como esta montada la pagina. Por eso el esquema de `PATCH /page-sections/:id`
-- no lo admite.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

UPDATE page_sections SET sort_order = 1 WHERE page_key = 'home' AND section_key = 'research_areas';
UPDATE page_sections SET sort_order = 2 WHERE page_key = 'home' AND section_key = 'carousel';

COMMIT;
