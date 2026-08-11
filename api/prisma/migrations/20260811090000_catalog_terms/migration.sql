-- Vocabularios que el titular gestiona desde el panel.
--
-- Puramente aditiva: no toca ninguna tabla existente ni anade restricciones sobre las
-- columnas que guardan estos codigos, que siguen siendo texto libre. Por eso no puede
-- romper datos ya cargados.
--
-- CUIDADO al regenerar migraciones con `prisma migrate diff`: la salida propone ademas
-- borrar `affiliations_department_matches_institution`,
-- `course_offerings_department_matches_institution`, `departments_id_institution_key` y
-- `works_search_vector_idx`. Prisma no los conoce porque estan escritos a mano en las
-- migraciones anteriores, y son los que respaldan RN-006 y la busqueda. Nunca se
-- incluyen esas lineas.

CREATE TABLE "catalog_terms" (
    "id" UUID NOT NULL,
    "catalog" VARCHAR(50) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalog_terms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_terms_catalog_code_key" ON "catalog_terms"("catalog", "code");
CREATE INDEX "catalog_terms_catalog_sort_order_idx" ON "catalog_terms"("catalog", "sort_order");
