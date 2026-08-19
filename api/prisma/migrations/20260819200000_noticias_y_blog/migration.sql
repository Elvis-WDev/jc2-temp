-- Noticias y entradas de blog, en una sola tabla.
--
-- Una noticia y una entrada son lo mismo por dentro y solo cambian en tono y formato, que
-- es una decision editorial. Misma decision que el ERS toma en RF-002 con `works`: una
-- tabla y el tipo como campo. `kind` sale del catalogo `post_kind`; `news` y `personal`
-- son codigos reservados porque de ellos cuelgan las dos rutas publicas.
--
-- Puramente aditiva: dos tablas nuevas y ninguna columna tocada de las que ya habia.
--
-- ESCRITA A MANO. Ver docs/architecture/migraciones.md: al generar una migracion, Prisma
-- propone ademas borrar las claves foraneas de RN-006, la unica de `departments` y el
-- indice de busqueda. Esas lineas nunca se incluyen.

CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(50) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "summary" TEXT,
    "content_markdown" TEXT,
    "image_media_id" UUID,
    "image_alt" VARCHAR(500),
    "editorial_status" "editorial_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "display_order" INTEGER,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");
CREATE INDEX "posts_kind_editorial_status_idx" ON "posts"("kind", "editorial_status");
CREATE INDEX "posts_published_at_idx" ON "posts"("published_at" DESC);

CREATE TABLE "post_files" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "label" VARCHAR(150),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "post_files_post_id_sort_order_idx" ON "post_files"("post_id", "sort_order");

-- El archivo se protege (RESTRICT): borrar un adjunto en uso pasa por quitarlo antes.
-- La entrada arrastra a sus adjuntos (CASCADE): sin ella no significan nada.
ALTER TABLE "posts"
  ADD CONSTRAINT "posts_image_media_id_fkey" FOREIGN KEY ("image_media_id")
  REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_created_by_fkey" FOREIGN KEY ("created_by")
  REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_updated_by_fkey" FOREIGN KEY ("updated_by")
  REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "post_files"
  ADD CONSTRAINT "post_files_post_id_fkey" FOREIGN KEY ("post_id")
  REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_files"
  ADD CONSTRAINT "post_files_media_id_fkey" FOREIGN KEY ("media_id")
  REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
