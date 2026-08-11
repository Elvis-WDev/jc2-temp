-- Secciones que se encienden y se apagan desde el panel.
--
-- Hasta ahora habia cuatro interruptores sueltos en site_settings y ninguna forma de
-- ocultar el resto de bloques ni una pagina entera. Aqui se unifican en una tabla y se
-- amplian al resto de secciones.
--
-- NO es un constructor de paginas (RF-020 lo prohibe en el MVP): las secciones las
-- define el codigo, y esta tabla solo guarda si se ven y en que orden. Una clave que el
-- codigo no conozca se ignora; una seccion del codigo sin fila se considera visible.
-- Asi, anadir una seccion mas adelante no obliga a migrar ni a tocar datos.
--
-- Los cuatro interruptores existentes SE CONVIERTEN conservando su valor, y despues se
-- borran sus columnas: dos fuentes para lo mismo es como se acaba con una pantalla que
-- dice una cosa y una web que hace otra.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

CREATE TABLE "page_sections" (
    "id" UUID NOT NULL,
    "page_key" VARCHAR(30) NOT NULL,
    -- La identifica dentro de su pagina. La conoce el codigo, no el usuario.
    "section_key" VARCHAR(50) NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "page_sections_page_key_section_key_key"
    ON "page_sections"("page_key", "section_key");
CREATE INDEX "page_sections_page_key_sort_order_idx"
    ON "page_sections"("page_key", "sort_order");

-- Eventos no tenia fila de contenido de pagina, asi que su cabecera estaba escrita en
-- el codigo del sitio. Con esta fila pasa a editarse como las demas, y ademas puede
-- ocultarse entera.
INSERT INTO "page_content" ("id", "page_key", "page_title", "is_published", "updated_at")
SELECT gen_random_uuid(), 'events', 'Eventos', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "page_content" WHERE "page_key" = 'events');

-- Las secciones de cada pagina, en el orden en que se pintan. Los cuatro valores que ya
-- existian se traen tal cual; el resto nacen visibles, que es como estan hoy.
INSERT INTO "page_sections" ("id", "page_key", "section_key", "is_visible", "sort_order", "updated_at")
SELECT gen_random_uuid(), v.page_key, v.section_key, v.is_visible, v.sort_order, CURRENT_TIMESTAMP
FROM (
    SELECT 'home' AS page_key, 'hero' AS section_key, true AS is_visible, 0 AS sort_order
    UNION ALL SELECT 'home', 'carousel', true, 1
    UNION ALL SELECT 'home', 'research_areas', true, 2
    UNION ALL SELECT 'home', 'featured_works',
        COALESCE((SELECT "show_home_featured_works" FROM "site_settings" LIMIT 1), true), 3
    UNION ALL SELECT 'home', 'featured_courses',
        COALESCE((SELECT "show_home_featured_courses" FROM "site_settings" LIMIT 1), true), 4
    UNION ALL SELECT 'home', 'events', true, 5
    UNION ALL SELECT 'research', 'header', true, 0
    UNION ALL SELECT 'research', 'filters',
        COALESCE((SELECT "show_research_filters" FROM "site_settings" LIMIT 1), true), 1
    UNION ALL SELECT 'teaching', 'header', true, 0
    UNION ALL SELECT 'teaching', 'filters',
        COALESCE((SELECT "show_teaching_filters" FROM "site_settings" LIMIT 1), true), 1
    UNION ALL SELECT 'events', 'header', true, 0
) AS v;

-- Guarda: si algo no se convirtio, la transaccion entera se cae y no queda a medias.
DO $$
DECLARE
    esperadas INTEGER := 11;
    creadas INTEGER;
    origen RECORD;
    convertidas RECORD;
BEGIN
    SELECT count(*) INTO creadas FROM "page_sections";
    IF creadas <> esperadas THEN
        RAISE EXCEPTION 'Se esperaban % secciones y hay %.', esperadas, creadas;
    END IF;

    SELECT "show_home_featured_works" AS w, "show_home_featured_courses" AS c,
           "show_research_filters" AS r, "show_teaching_filters" AS t
      INTO origen FROM "site_settings" LIMIT 1;

    IF FOUND THEN
        SELECT
            (SELECT "is_visible" FROM "page_sections" WHERE "page_key"='home' AND "section_key"='featured_works') AS w,
            (SELECT "is_visible" FROM "page_sections" WHERE "page_key"='home' AND "section_key"='featured_courses') AS c,
            (SELECT "is_visible" FROM "page_sections" WHERE "page_key"='research' AND "section_key"='filters') AS r,
            (SELECT "is_visible" FROM "page_sections" WHERE "page_key"='teaching' AND "section_key"='filters') AS t
          INTO convertidas;

        IF convertidas.w IS DISTINCT FROM origen.w
           OR convertidas.c IS DISTINCT FROM origen.c
           OR convertidas.r IS DISTINCT FROM origen.r
           OR convertidas.t IS DISTINCT FROM origen.t THEN
            RAISE EXCEPTION 'Los interruptores no conservaron su valor al convertirse.';
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "page_content" WHERE "page_key" = 'events') THEN
        RAISE EXCEPTION 'Falta la fila de contenido de la pagina de eventos.';
    END IF;
END $$;

-- Ya convertidos: se van, para que quede una sola fuente.
ALTER TABLE "site_settings"
    DROP COLUMN "show_home_featured_works",
    DROP COLUMN "show_home_featured_courses",
    DROP COLUMN "show_research_filters",
    DROP COLUMN "show_teaching_filters";

COMMIT;
