-- El estado academico deja de ser un enum y pasa a ser un catalogo editable.
--
-- Por que se puede: ninguna regla de negocio decide segun este valor. Todas usan
-- `editorial_status`, que SIGUE siendo un enum porque es la unica puerta de la
-- visibilidad publica (RN-001) y de el dependen RN-002 y RN-003.
--
-- Conversion de datos con red: si algun trabajo no encontrara su estado, la excepcion
-- aborta la transaccion entera y la base queda como estaba.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

CREATE TABLE "academic_statuses" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    -- Color con el que se pinta en las tablas. Si los estados los crea el titular, el
    -- color tambien: un mapa fijo en el codigo no podria cubrir uno nuevo.
    "tone" VARCHAR(20) NOT NULL DEFAULT 'neutral',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_statuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academic_statuses_code_key" ON "academic_statuses"("code");

-- Los ocho valores que existian, con la etiqueta y el color que ya usaba el panel.
INSERT INTO "academic_statuses" ("id", "code", "label", "tone", "sort_order") VALUES
  (gen_random_uuid(), 'published',           'Publicado',          'success', 0),
  (gen_random_uuid(), 'forthcoming',         'En prensa',          'info',    1),
  (gen_random_uuid(), 'accepted',            'Aceptado',           'info',    2),
  (gen_random_uuid(), 'revise_and_resubmit', 'Revisar y reenviar', 'warning', 3),
  (gen_random_uuid(), 'under_review',        'En revision',        'warning', 4),
  (gen_random_uuid(), 'working_paper',       'Working paper',      'info',    5),
  (gen_random_uuid(), 'work_in_progress',    'En curso',           'info',    6),
  (gen_random_uuid(), 'inactive',            'Inactivo',           'neutral', 7);

ALTER TABLE "works" ADD COLUMN "academic_status_id" UUID;

UPDATE "works" w
   SET "academic_status_id" = s."id"
  FROM "academic_statuses" s
 WHERE s."code" = w."academic_status"::text;

-- Ningun trabajo puede quedarse sin estado. Si pasara, se aborta todo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "works" WHERE "academic_status_id" IS NULL) THEN
    RAISE EXCEPTION 'Hay trabajos que no encontraron su estado academico; se aborta la migracion';
  END IF;
END $$;

ALTER TABLE "works" ALTER COLUMN "academic_status_id" SET NOT NULL;

ALTER TABLE "works"
  ADD CONSTRAINT "works_academic_status_id_fkey"
  FOREIGN KEY ("academic_status_id") REFERENCES "academic_statuses"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX "works_academic_status_id_idx" ON "works"("academic_status_id");

DROP INDEX IF EXISTS "works_academic_status_idx";
ALTER TABLE "works" DROP COLUMN "academic_status";
DROP TYPE "academic_status";

COMMIT;
