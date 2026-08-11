-- Eventos: seminarios, congresos, defensas y convocatorias.
--
-- Viene del sistema anterior, donde era un tipo de contenido propio. No existia nada
-- equivalente aqui.
--
-- Puramente aditiva: dos tablas nuevas y ninguna columna tocada.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    -- Codigo del catalogo `event`: seminario, congreso, defensa...
    "event_type" VARCHAR(50),
    "summary" TEXT,
    "content_markdown" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "location" VARCHAR(300),
    "organizer" VARCHAR(300),
    "image_media_id" UUID,
    "image_alt" VARCHAR(500),
    -- El boton de la web: texto, destino y color. El color es libre porque pertenece a
    -- la identidad del evento, no a la paleta del panel.
    "button_label" VARCHAR(100),
    "button_url" TEXT,
    "button_color" VARCHAR(20),
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "editorial_status" "editorial_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "sort_order" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
CREATE INDEX "events_editorial_status_idx" ON "events"("editorial_status");
-- La web lista por fecha descendente: es el orden natural de una agenda.
CREATE INDEX "events_starts_at_idx" ON "events"("starts_at" DESC);

ALTER TABLE "events"
  ADD CONSTRAINT "events_image_media_id_fkey"
  FOREIGN KEY ("image_media_id") REFERENCES "media_assets"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- Un evento puede estar organizado por varias instituciones, y una institucion tiene
-- varios eventos.
CREATE TABLE "event_institutions" (
    "event_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_institutions_pkey" PRIMARY KEY ("event_id", "institution_id")
);

ALTER TABLE "event_institutions"
  ADD CONSTRAINT "event_institutions_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

-- RESTRICT y no CASCADE: borrar una institucion no puede llevarse por delante la
-- organizacion de un evento sin avisar, igual que pasa con departamentos y cursos.
ALTER TABLE "event_institutions"
  ADD CONSTRAINT "event_institutions_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "institutions"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX "event_institutions_institution_id_idx" ON "event_institutions"("institution_id");

COMMIT;
