-- Estilos de cita y los ultimos campos que faltaban respecto al sistema anterior.
--
-- Puramente aditiva: dos tablas nuevas y cuatro columnas.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

-- Estilos en los que se puede escribir una cita: APA, Chicago, BibTeX...
CREATE TABLE "citation_styles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    -- Extension del archivo al descargar la cita (.bib, .ris). Vacia si es texto plano.
    "extension" VARCHAR(20),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_styles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "citation_styles_code_key" ON "citation_styles"("code");

INSERT INTO "citation_styles" ("id", "code", "name", "extension", "sort_order") VALUES
  (gen_random_uuid(), 'apa',     'APA',     NULL,   0),
  (gen_random_uuid(), 'chicago', 'Chicago', NULL,   1),
  (gen_random_uuid(), 'mla',     'MLA',     NULL,   2),
  (gen_random_uuid(), 'harvard', 'Harvard', NULL,   3),
  (gen_random_uuid(), 'bibtex',  'BibTeX',  'bib',  4),
  (gen_random_uuid(), 'ris',     'RIS',     'ris',  5);

-- Una cita por trabajo y estilo. La pareja es unica: no tiene sentido tener dos
-- versiones del mismo trabajo en el mismo estilo.
CREATE TABLE "work_citations" (
    "id" UUID NOT NULL,
    "work_id" UUID NOT NULL,
    "citation_style_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_citations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_citations_work_style_key"
  ON "work_citations"("work_id", "citation_style_id");

-- CASCADE desde el trabajo: una cita no significa nada sin el.
ALTER TABLE "work_citations"
  ADD CONSTRAINT "work_citations_work_fkey"
  FOREIGN KEY ("work_id") REFERENCES "works"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

-- RESTRICT hacia el estilo: borrar un estilo no puede llevarse por delante las citas
-- escritas a mano en el.
ALTER TABLE "work_citations"
  ADD CONSTRAINT "work_citations_style_fkey"
  FOREIGN KEY ("citation_style_id") REFERENCES "citation_styles"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX "work_citations_style_idx" ON "work_citations"("citation_style_id");

-- Cuantos trabajos de cada tipo salen en la portada. NULL = sin limite propio.
ALTER TABLE "work_types" ADD COLUMN "max_items_home" INTEGER;

-- Version del trabajo entero. Ya existia `version_label` por archivo, que es otra cosa:
-- esta dice en que version esta el trabajo, aquella que version es cada PDF.
ALTER TABLE "works" ADD COLUMN "version_label" VARCHAR(50);

-- Codigo que el lector necesita para descargar el documento en una web externa.
-- Es informativo: se muestra junto al enlace y NO restringe nada aqui dentro.
ALTER TABLE "works" ADD COLUMN "download_code" VARCHAR(100);

-- Icono propio subido para un enlace personal, ademas de los de la lista.
ALTER TABLE "person_links" ADD COLUMN "icon_media_id" UUID;

ALTER TABLE "person_links"
  ADD CONSTRAINT "person_links_icon_media_id_fkey"
  FOREIGN KEY ("icon_media_id") REFERENCES "media_assets"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

COMMIT;
