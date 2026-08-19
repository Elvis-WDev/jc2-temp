# Database Architecture

## Primary Database

- Engine: PostgreSQL.
- ORM/query layer: Prisma.
- Migration strategy: versioned Prisma migrations.

## Data Ownership

| Table/Collection | Owner | Notes |
| --- | --- | --- |
| `{{TABLE}}` | `{{MODULE}}` | Description. |

## Migration Rules

- Schema changes require a migration.
- Generated database docs must be refreshed after migrations.
- Destructive migrations require an explicit data plan.
- Production migration credentials should be limited after initial provisioning.
- Use PostgreSQL in production. Do not silently fall back to SQLite.
- Avoid data loss on redeploy. Application containers must not own production database storage.
- **Before generating a migration, read [migraciones.md](migraciones.md).** Parts of this
  schema are hand-written SQL that Prisma does not know about, so it proposes dropping
  them; those lines must be removed before applying. Doing otherwise has already cost the
  RN-006 constraints once.

## Indexing

- List critical queries.
- Map each critical query to an index.

## Auth Tables

Better Auth owns its auth-related tables. Application code should not manually mutate password/session internals except through documented Better Auth APIs.
