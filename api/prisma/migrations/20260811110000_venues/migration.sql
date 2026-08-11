-- Revistas y editoriales como ficha propia.
--
-- Antes el nombre de la publicacion, el ISSN y la editorial eran texto suelto repetido
-- en cada trabajo, y no habia sitio para el ranking ni el CiteScore. Ahora la revista
-- es una ficha que se reutiliza.
--
-- Lo que cambia de un articulo a otro (volumen, numero, paginas, ano) SE QUEDA en el
-- trabajo: mezclarlo en la ficha obligaria a crear una entrada por cada volumen.
--
-- Conversion de datos: se crea una revista por cada `venue_name` distinto que ya exista
-- y se apunta cada trabajo a la suya. Nada de lo escrito se pierde.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "abbreviation" VARCHAR(100),
    -- Codigo del catalogo `venue`: revista, editorial, congreso, serie de working
    -- papers... Texto libre, como el resto de catalogos.
    "venue_type" VARCHAR(50),
    "publisher_name" VARCHAR(300),
    "issn" VARCHAR(20),
    "isbn_prefix" VARCHAR(30),
    "country_code" CHAR(2),
    "website_url" TEXT,
    -- Como se mide la calidad de la revista. `ranking` es texto porque cada escala usa
    -- su notacion (Q1, A*, 4*) y forzar un numero perderia informacion.
    "ranking" VARCHAR(50),
    "cite_score" NUMERIC(6,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- Dos revistas no pueden llamarse igual: es lo que hace que la ficha se reutilice en
-- vez de duplicarse cada vez que se escribe el nombre.
CREATE UNIQUE INDEX "venues_name_key" ON "venues"("name");
CREATE INDEX "venues_is_active_idx" ON "venues"("is_active");

ALTER TABLE "works" ADD COLUMN "venue_id" UUID;

-- Una ficha por cada nombre distinto que ya estuviera escrito.
INSERT INTO "venues" ("id", "name")
SELECT gen_random_uuid(), TRIM(w."venue_name")
  FROM "works" w
 WHERE w."venue_name" IS NOT NULL AND TRIM(w."venue_name") <> ''
 GROUP BY TRIM(w."venue_name");

UPDATE "works" w
   SET "venue_id" = v."id"
  FROM "venues" v
 WHERE v."name" = TRIM(w."venue_name");

-- Ningun trabajo que tuviera nombre puede quedarse sin ficha.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "works"
     WHERE "venue_name" IS NOT NULL AND TRIM("venue_name") <> '' AND "venue_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Hay trabajos con publicacion que no encontraron su ficha; se aborta';
  END IF;
END $$;

-- Un trabajo tiene ficha O texto suelto, nunca los dos: si no, los dos nombres podrian
-- acabar diciendo cosas distintas.
UPDATE "works" SET "venue_name" = NULL WHERE "venue_id" IS NOT NULL;

ALTER TABLE "works"
  ADD CONSTRAINT "works_venue_id_fkey"
  FOREIGN KEY ("venue_id") REFERENCES "venues"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX "works_venue_id_idx" ON "works"("venue_id");

-- --- Busqueda -------------------------------------------------------------
-- El nombre de la revista sigue contando para buscar, pero ahora vive en otra tabla:
-- se resuelve al vuelo y se conserva el texto suelto como alternativa.

CREATE OR REPLACE FUNCTION works_venue_label(p_venue_id uuid, p_venue_name text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE((SELECT v."name" FROM "venues" v WHERE v."id" = p_venue_id), p_venue_name);
$$;

CREATE OR REPLACE FUNCTION works_search_vector_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := works_compute_search_vector(
    NEW.id, NEW.title, NEW.subtitle, NEW.abstract_markdown,
    works_venue_label(NEW.venue_id, NEW.venue_name), NEW.publisher_name
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION works_refresh_from_relation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_work_id uuid;
BEGIN
  v_work_id := COALESCE(NEW.work_id, OLD.work_id);
  UPDATE "works" w
     SET search_vector = works_compute_search_vector(
       w.id, w.title, w.subtitle, w.abstract_markdown,
       works_venue_label(w.venue_id, w.venue_name), w.publisher_name
     )
   WHERE w.id = v_work_id;
  RETURN NULL;
END;
$$;

-- Renombrar una revista debe refrescar los trabajos que la citan, igual que ya pasa al
-- cambiar autores o etiquetas.
CREATE OR REPLACE FUNCTION works_refresh_from_venue() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."name" IS DISTINCT FROM OLD."name" THEN
    UPDATE "works" w
       SET search_vector = works_compute_search_vector(
         w.id, w.title, w.subtitle, w.abstract_markdown,
         works_venue_label(w.venue_id, w.venue_name), w.publisher_name
       )
     WHERE w."venue_id" = NEW."id";
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER venues_refresh_search
  AFTER UPDATE ON "venues"
  FOR EACH ROW EXECUTE FUNCTION works_refresh_from_venue();

-- Recalculo para las filas que ya existian.
UPDATE "works" w
   SET search_vector = works_compute_search_vector(
     w.id, w.title, w.subtitle, w.abstract_markdown,
     works_venue_label(w.venue_id, w.venue_name), w.publisher_name
   );

COMMIT;
