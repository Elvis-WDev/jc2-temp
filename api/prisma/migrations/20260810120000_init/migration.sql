-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "editorial_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "academic_status" AS ENUM ('published', 'forthcoming', 'accepted', 'revise_and_resubmit', 'under_review', 'working_paper', 'work_in_progress', 'inactive');

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "is_site_owner" BOOLEAN NOT NULL DEFAULT false,
    "full_name" VARCHAR(200) NOT NULL,
    "given_name" VARCHAR(100),
    "family_name" VARCHAR(100),
    "preferred_name" VARCHAR(150),
    "professional_title" VARCHAR(200),
    "current_position" VARCHAR(250),
    "public_email" VARCHAR(320),
    "phone" VARCHAR(50),
    "city" VARCHAR(120),
    "country_code" CHAR(2),
    "short_bio" TEXT,
    "full_bio_markdown" TEXT,
    "research_statement_markdown" TEXT,
    "photo_media_id" UUID,
    "cv_media_id" UUID,
    "orcid" VARCHAR(40),
    "google_scholar_url" TEXT,
    "scopus_url" TEXT,
    "ssrn_url" TEXT,
    "repec_url" TEXT,
    "website_url" TEXT,
    "sort_name" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_links" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "link_type" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100),
    "url" TEXT NOT NULL,
    "icon_key" VARCHAR(50),
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "person_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "short_name" VARCHAR(100),
    "slug" VARCHAR(180) NOT NULL,
    "website_url" TEXT,
    "country_code" CHAR(2),
    "city" VARCHAR(120),
    "logo_media_id" UUID,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "short_name" VARCHAR(120),
    "slug" VARCHAR(180) NOT NULL,
    "website_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliations" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "department_id" UUID,
    "title" VARCHAR(250) NOT NULL,
    "affiliation_type" VARCHAR(50),
    "start_date" DATE,
    "end_date" DATE,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description_markdown" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "public_url" TEXT,
    "original_filename" TEXT NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" CHAR(64),
    "alt_text" TEXT,
    "caption" TEXT,
    "credit" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "plural_label" VARCHAR(120) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "work_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "works" (
    "id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "slug" VARCHAR(260) NOT NULL,
    "abstract_markdown" TEXT,
    "description_markdown" TEXT,
    "academic_status" "academic_status" NOT NULL,
    "editorial_status" "editorial_status" NOT NULL DEFAULT 'draft',
    "publication_date" DATE,
    "publication_year" SMALLINT,
    "first_online_date" DATE,
    "venue_name" VARCHAR(300),
    "publisher_name" VARCHAR(300),
    "volume" VARCHAR(50),
    "issue" VARCHAR(50),
    "pages" VARCHAR(50),
    "article_number" VARCHAR(100),
    "doi" VARCHAR(255),
    "isbn" VARCHAR(50),
    "issn" VARCHAR(50),
    "language_code" VARCHAR(10),
    "cover_media_id" UUID,
    "citation_text_override" TEXT,
    "bibtex_override" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_order" INTEGER,
    "display_order" INTEGER,
    "is_open_access" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_authors" (
    "work_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "author_order" INTEGER NOT NULL,
    "contribution_role" VARCHAR(80),
    "is_corresponding" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_authors_pkey" PRIMARY KEY ("work_id","person_id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "category" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_tags" (
    "work_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_tags_pkey" PRIMARY KEY ("work_id","tag_id")
);

-- CreateTable
CREATE TABLE "work_links" (
    "id" UUID NOT NULL,
    "work_id" UUID NOT NULL,
    "link_type" VARCHAR(50) NOT NULL,
    "label" VARCHAR(120),
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "work_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_files" (
    "id" UUID NOT NULL,
    "work_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "label" VARCHAR(150),
    "version_label" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "short_title" VARCHAR(160),
    "slug" VARCHAR(220) NOT NULL,
    "default_code" VARCHAR(80),
    "level" VARCHAR(80),
    "summary" TEXT,
    "description_markdown" TEXT,
    "cover_media_id" UUID,
    "editorial_status" "editorial_status" NOT NULL DEFAULT 'draft',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_order" INTEGER,
    "display_order" INTEGER,
    "published_at" TIMESTAMPTZ(6),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_tags" (
    "course_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_tags_pkey" PRIMARY KEY ("course_id","tag_id")
);

-- CreateTable
CREATE TABLE "course_offerings" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "department_id" UUID,
    "name" VARCHAR(250),
    "course_code" VARCHAR(80),
    "term" VARCHAR(100),
    "academic_year" SMALLINT,
    "start_date" DATE,
    "end_date" DATE,
    "teaching_role" VARCHAR(120),
    "summary" TEXT,
    "content_markdown" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "editorial_status" "editorial_status" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_materials" (
    "id" UUID NOT NULL,
    "course_offering_id" UUID NOT NULL,
    "media_id" UUID,
    "external_url" TEXT,
    "material_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_content" (
    "id" UUID NOT NULL,
    "page_key" VARCHAR(30) NOT NULL,
    "page_title" VARCHAR(250),
    "eyebrow" VARCHAR(120),
    "intro_markdown" TEXT,
    "secondary_markdown" TEXT,
    "hero_media_id" UUID,
    "hero_alt" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "page_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" UUID NOT NULL,
    "is_singleton" BOOLEAN NOT NULL DEFAULT true,
    "site_name" VARCHAR(200) NOT NULL,
    "owner_person_id" UUID NOT NULL,
    "default_locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'UTC',
    "public_base_url" TEXT NOT NULL,
    "contact_email" VARCHAR(320),
    "meta_title_default" VARCHAR(200),
    "meta_description_default" TEXT,
    "og_image_media_id" UUID,
    "show_home_featured_works" BOOLEAN NOT NULL DEFAULT true,
    "show_home_featured_courses" BOOLEAN NOT NULL DEFAULT true,
    "show_research_filters" BOOLEAN NOT NULL DEFAULT true,
    "show_teaching_filters" BOOLEAN NOT NULL DEFAULT true,
    "footer_text" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" UUID,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "role" VARCHAR(30) NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(6),
    "refresh_token_expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "persons_sort_name_idx" ON "persons"("sort_name");

-- CreateIndex
CREATE INDEX "person_links_person_id_sort_order_idx" ON "person_links"("person_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "person_links_person_id_link_type_url_key" ON "person_links"("person_id", "link_type", "url");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_slug_key" ON "institutions"("slug");

-- CreateIndex
CREATE INDEX "institutions_is_active_idx" ON "institutions"("is_active");

-- CreateIndex
CREATE INDEX "departments_institution_id_idx" ON "departments"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_institution_id_slug_key" ON "departments"("institution_id", "slug");

-- CreateIndex
CREATE INDEX "affiliations_person_id_sort_order_idx" ON "affiliations"("person_id", "sort_order");

-- CreateIndex
CREATE INDEX "affiliations_is_current_idx" ON "affiliations"("is_current");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_checksum_sha256_idx" ON "media_assets"("checksum_sha256");

-- CreateIndex
CREATE INDEX "media_assets_is_public_idx" ON "media_assets"("is_public");

-- CreateIndex
CREATE UNIQUE INDEX "work_types_code_key" ON "work_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "works_slug_key" ON "works"("slug");

-- CreateIndex
CREATE INDEX "works_editorial_status_idx" ON "works"("editorial_status");

-- CreateIndex
CREATE INDEX "works_work_type_id_idx" ON "works"("work_type_id");

-- CreateIndex
CREATE INDEX "works_academic_status_idx" ON "works"("academic_status");

-- CreateIndex
CREATE INDEX "works_publication_year_idx" ON "works"("publication_year" DESC);

-- CreateIndex
CREATE INDEX "works_is_featured_featured_order_idx" ON "works"("is_featured", "featured_order");

-- CreateIndex
CREATE INDEX "works_doi_idx" ON "works"("doi");

-- CreateIndex
CREATE INDEX "work_authors_person_id_idx" ON "work_authors"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_authors_work_id_author_order_key" ON "work_authors"("work_id", "author_order");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "work_tags_tag_id_idx" ON "work_tags"("tag_id");

-- CreateIndex
CREATE INDEX "work_links_work_id_sort_order_idx" ON "work_links"("work_id", "sort_order");

-- CreateIndex
CREATE INDEX "work_files_work_id_sort_order_idx" ON "work_files"("work_id", "sort_order");

-- CreateIndex
CREATE INDEX "work_files_media_id_idx" ON "work_files"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_editorial_status_idx" ON "courses"("editorial_status");

-- CreateIndex
CREATE INDEX "courses_is_featured_featured_order_idx" ON "courses"("is_featured", "featured_order");

-- CreateIndex
CREATE INDEX "course_tags_tag_id_idx" ON "course_tags"("tag_id");

-- CreateIndex
CREATE INDEX "course_offerings_course_id_idx" ON "course_offerings"("course_id");

-- CreateIndex
CREATE INDEX "course_offerings_institution_id_idx" ON "course_offerings"("institution_id");

-- CreateIndex
CREATE INDEX "course_offerings_department_id_idx" ON "course_offerings"("department_id");

-- CreateIndex
CREATE INDEX "course_offerings_is_active_idx" ON "course_offerings"("is_active");

-- CreateIndex
CREATE INDEX "course_offerings_academic_year_idx" ON "course_offerings"("academic_year" DESC);

-- CreateIndex
CREATE INDEX "course_offerings_editorial_status_idx" ON "course_offerings"("editorial_status");

-- CreateIndex
CREATE INDEX "course_materials_course_offering_id_sort_order_idx" ON "course_materials"("course_offering_id", "sort_order");

-- CreateIndex
CREATE INDEX "course_materials_media_id_idx" ON "course_materials"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_content_page_key_key" ON "page_content"("page_key");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_is_singleton_key" ON "site_settings"("is_singleton");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_photo_media_id_fkey" FOREIGN KEY ("photo_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_cv_media_id_fkey" FOREIGN KEY ("cv_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_links" ADD CONSTRAINT "person_links_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_logo_media_id_fkey" FOREIGN KEY ("logo_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_authors" ADD CONSTRAINT "work_authors_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_authors" ADD CONSTRAINT "work_authors_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_links" ADD CONSTRAINT "work_links_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_files" ADD CONSTRAINT "work_files_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_files" ADD CONSTRAINT "work_files_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_tags" ADD CONSTRAINT "course_tags_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_tags" ADD CONSTRAINT "course_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_content" ADD CONSTRAINT "page_content_hero_media_id_fkey" FOREIGN KEY ("hero_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_content" ADD CONSTRAINT "page_content_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_owner_person_id_fkey" FOREIGN KEY ("owner_person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_image_media_id_fkey" FOREIGN KEY ("og_image_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- Restricciones que Prisma no sabe expresar.
--
-- Van en la base de datos, no solo en el dominio: una regla que solo vive en el
-- codigo se salta con cualquier script, importacion o consola de mantenimiento.
-- ============================================================================

-- ERS §8: "solo una persona puede tener is_site_owner = true".
-- Indice unico parcial: entre las filas con is_site_owner true, el valor debe ser
-- unico, de modo que solo puede existir una.
CREATE UNIQUE INDEX "persons_single_site_owner"
  ON "persons" ("is_site_owner")
  WHERE "is_site_owner";

-- ERS §26: "Debe existir exactamente un registro activo". El UNIQUE lo genera
-- Prisma; el CHECK impide burlarlo insertando is_singleton = false.
ALTER TABLE "site_settings"
  ADD CONSTRAINT "site_settings_singleton" CHECK ("is_singleton");

-- ERS §24: debe existir exactamente uno de media_id / external_url.
ALTER TABLE "course_materials"
  ADD CONSTRAINT "course_materials_media_xor_url" CHECK (
    (("media_id" IS NOT NULL)::int + ("external_url" IS NOT NULL)::int) = 1
  );

-- ERS §15: published_at es obligatorio cuando editorial_status = published.
ALTER TABLE "works"
  ADD CONSTRAINT "works_published_requires_published_at" CHECK (
    "editorial_status" <> 'published'::"editorial_status" OR "published_at" IS NOT NULL
  );

ALTER TABLE "courses"
  ADD CONSTRAINT "courses_published_requires_published_at" CHECK (
    "editorial_status" <> 'published'::"editorial_status" OR "published_at" IS NOT NULL
  );

ALTER TABLE "course_offerings"
  ADD CONSTRAINT "course_offerings_published_requires_published_at" CHECK (
    "editorial_status" <> 'published'::"editorial_status" OR "published_at" IS NOT NULL
  );

-- ERS §15: publication_year entre 1800 y el ano actual + 5.
-- La cota superior exacta depende de la fecha, y PostgreSQL no admite expresiones
-- volatiles en un CHECK. Aqui va una cota estatica amplia que descarta datos
-- absurdos; la regla precisa se valida en el dominio, donde si se conoce "hoy".
ALTER TABLE "works"
  ADD CONSTRAINT "works_publication_year_range" CHECK (
    "publication_year" IS NULL OR ("publication_year" BETWEEN 1800 AND 2100)
  );

-- RN-006 y ERS §13: si se asigna un departamento, debe pertenecer a la institucion
-- seleccionada. Se consigue con una clave foranea compuesta contra (id, institution_id)
-- de departments. Con department_id NULL la restriccion no se evalua (MATCH SIMPLE),
-- que es justo lo que queremos para un departamento opcional.
ALTER TABLE "departments"
  ADD CONSTRAINT "departments_id_institution_key" UNIQUE ("id", "institution_id");

ALTER TABLE "course_offerings"
  ADD CONSTRAINT "course_offerings_department_matches_institution"
  FOREIGN KEY ("department_id", "institution_id")
  REFERENCES "departments" ("id", "institution_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "affiliations"
  ADD CONSTRAINT "affiliations_department_matches_institution"
  FOREIGN KEY ("department_id", "institution_id")
  REFERENCES "departments" ("id", "institution_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
