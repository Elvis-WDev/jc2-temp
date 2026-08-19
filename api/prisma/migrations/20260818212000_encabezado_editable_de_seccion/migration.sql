-- Rotulo editable de una banda del sitio publico (ERS §2.2: los textos de seccion no
-- se hardcodean).
--
-- Puramente aditiva: dos columnas opcionales. Vacias significa "el rotulo de la
-- plantilla", asi que ninguna seccion cambia de aspecto al aplicarla.
--
-- ESCRITA A MANO A PROPOSITO. `prisma migrate dev` propone ademas borrar
-- `affiliations_department_matches_institution`,
-- `course_offerings_department_matches_institution`, `departments_id_institution_key` y
-- `works_search_vector_idx`, y quitar los DEFAULT de varias columnas `updated_at`.
-- Prisma no conoce esos objetos porque estan escritos a mano en migraciones anteriores,
-- y son los que respaldan RN-006 y la busqueda. Esas lineas NUNCA se incluyen; si al
-- generar una migracion aparecen, se borran antes de aplicarla. Ya aviso de esto
-- 20260811090000_catalog_terms.

ALTER TABLE "page_sections"
  ADD COLUMN "heading" VARCHAR(120),
  ADD COLUMN "heading_aside" VARCHAR(120);
