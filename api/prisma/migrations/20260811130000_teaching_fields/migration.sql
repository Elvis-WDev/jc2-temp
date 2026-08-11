-- Quien imparte cada edicion, y los campos que faltaban respecto al sistema anterior.
--
-- Puramente aditiva: una tabla nueva y cinco columnas. `teaching_role` se conserva tal
-- cual, con lo que ya hubiera escrito: la tabla nueva no lo sustituye de golpe.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

-- Personas concretas que impartieron una edicion. Antes solo habia un texto libre con
-- el papel, sin forma de enlazar la ficha de nadie.
CREATE TABLE "course_offering_teachers" (
    "course_offering_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "role" VARCHAR(120),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_offering_teachers_pkey" PRIMARY KEY ("course_offering_id", "person_id")
);

-- CASCADE desde la edicion: borrarla se lleva su reparto de docencia, que no significa
-- nada por separado.
ALTER TABLE "course_offering_teachers"
  ADD CONSTRAINT "course_offering_teachers_offering_fkey"
  FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

-- RESTRICT hacia la persona: RN-008 ya impide borrar a quien firma trabajos, y lo mismo
-- vale para quien consta como docente.
ALTER TABLE "course_offering_teachers"
  ADD CONSTRAINT "course_offering_teachers_person_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX "course_offering_teachers_person_id_idx" ON "course_offering_teachers"("person_id");

-- Enlace a la ficha oficial del curso en la web de la institucion.
ALTER TABLE "courses" ADD COLUMN "external_url" TEXT;

-- Los departamentos no tenian descripcion ni orden manual; los trabajos y cursos si.
ALTER TABLE "departments" ADD COLUMN "description_markdown" TEXT;
ALTER TABLE "departments" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Color de marca para distinguir instituciones en la web, y orden manual.
ALTER TABLE "institutions" ADD COLUMN "brand_color" VARCHAR(20);
ALTER TABLE "institutions" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

COMMIT;
