-- Busqueda full-text de Research (RF-011, ERS §46).
--
-- El indice que sugiere ERS §15 solo cubre titulo, subtitulo, abstract, venue y
-- publisher, pero RF-011 y §46 exigen buscar TAMBIEN por autores y tags, que viven en
-- otras tablas. Se resuelve con una columna `search_vector` materializada y mantenida
-- por trigger: buscar con un JOIN a work_authors y work_tags en cada consulta obligaria
-- a un GROUP BY sobre toda la coleccion y no podria usar indice.
--
-- Configuracion 'english': el contenido academico es ingles y la lematizacion mejora
-- mucho la busqueda en abstracts ("auctions" encuentra "auction").
--
-- Pesos: A titulo, B subtitulo/autores/tags, C venue/publisher, D abstract. Permiten
-- ordenar por relevancia con ts_rank sin que una coincidencia en el abstract pese lo
-- mismo que una en el titulo.

ALTER TABLE "works" ADD COLUMN "search_vector" tsvector;

CREATE OR REPLACE FUNCTION works_compute_search_vector(
  p_work_id uuid,
  p_title text,
  p_subtitle text,
  p_abstract text,
  p_venue text,
  p_publisher text
) RETURNS tsvector LANGUAGE sql STABLE AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p_subtitle, '')), 'B') ||
    setweight(
      to_tsvector('english', coalesce((
        SELECT string_agg(p.full_name, ' ')
        FROM work_authors wa
        JOIN persons p ON p.id = wa.person_id
        WHERE wa.work_id = p_work_id
      ), '')),
      'B'
    ) ||
    setweight(
      to_tsvector('english', coalesce((
        SELECT string_agg(t.name, ' ')
        FROM work_tags wt
        JOIN tags t ON t.id = wt.tag_id
        WHERE wt.work_id = p_work_id
      ), '')),
      'B'
    ) ||
    setweight(
      to_tsvector('english', coalesce(p_venue, '') || ' ' || coalesce(p_publisher, '')),
      'C'
    ) ||
    setweight(to_tsvector('english', coalesce(p_abstract, '')), 'D')
$$;

-- BEFORE sobre works: asigna la columna directamente, sin un UPDATE anidado que
-- volveria a disparar el trigger.
CREATE OR REPLACE FUNCTION works_search_vector_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := works_compute_search_vector(
    NEW.id, NEW.title, NEW.subtitle, NEW.abstract_markdown, NEW.venue_name, NEW.publisher_name
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER works_search_vector_biu
  BEFORE INSERT OR UPDATE ON "works"
  FOR EACH ROW EXECUTE FUNCTION works_search_vector_trigger();

-- Cambiar autores o tags tambien debe refrescar el vector del trabajo afectado.
-- El UPDATE vuelve a disparar el trigger BEFORE, que recalcula lo mismo: es
-- idempotente y termina, porque ese trigger no lanza mas escrituras.
CREATE OR REPLACE FUNCTION works_refresh_from_relation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_work_id uuid;
BEGIN
  v_work_id := COALESCE(NEW.work_id, OLD.work_id);
  UPDATE "works" w
     SET search_vector = works_compute_search_vector(
       w.id, w.title, w.subtitle, w.abstract_markdown, w.venue_name, w.publisher_name
     )
   WHERE w.id = v_work_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER work_authors_refresh_search
  AFTER INSERT OR UPDATE OR DELETE ON "work_authors"
  FOR EACH ROW EXECUTE FUNCTION works_refresh_from_relation();

CREATE TRIGGER work_tags_refresh_search
  AFTER INSERT OR UPDATE OR DELETE ON "work_tags"
  FOR EACH ROW EXECUTE FUNCTION works_refresh_from_relation();

-- GIN: el indice adecuado para tsvector.
CREATE INDEX "works_search_vector_idx" ON "works" USING GIN ("search_vector");

-- Relleno inicial para las filas que ya existieran.
UPDATE "works" w
   SET search_vector = works_compute_search_vector(
     w.id, w.title, w.subtitle, w.abstract_markdown, w.venue_name, w.publisher_name
   );
