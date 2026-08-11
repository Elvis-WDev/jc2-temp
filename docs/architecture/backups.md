# Backups y restauración

Cumple `ERS.md` §43.

## Qué hay que respaldar

Dos cosas independientes, y **ambas** hacen falta para restaurar:

| Qué | Dónde | Si se pierde |
|---|---|---|
| Base de datos PostgreSQL | Servidor de base de datos | Se pierde todo el contenido |
| Archivos subidos | Volumen montado en `STORAGE_ROOT` | Las filas de `media_assets` quedan apuntando al vacío |

Restaurar solo uno de los dos deja el sistema incoherente. La aplicación lo tolera —un
archivo ausente responde 404 en lugar de romperse— pero el contenido se pierde igual.

## PostgreSQL

Backup diario, retención mínima de 7 días y recomendada de 30 (ERS §43):

```bash
pg_dump --format=custom --no-owner --no-privileges \
  "$DATABASE_URL" > "jc2-$(date -u +%Y%m%d).dump"
```

Restauración sobre una base vacía:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" jc2-YYYYMMDD.dump
corepack pnpm exec prisma migrate deploy
```

> El `search_vector` de `works` lo mantiene un trigger, no la aplicación. Un
> `pg_restore` conserva la columna, pero si alguna vez se reconstruye la tabla a mano
> hay que refrescarla:
>
> ```sql
> UPDATE works w SET search_vector = works_compute_search_vector(
>   w.id, w.title, w.subtitle, w.abstract_markdown, w.venue_name, w.publisher_name);
> ```

## Archivos

`STORAGE_ROOT` es un volumen. Los binarios son inmutables bajo su `storage_key`, así
que un backup incremental es barato: los archivos existentes nunca cambian.

```bash
rsync -a --delete /data/storage/ /backup/jc2-storage/
```

`tmp/` puede excluirse: solo contiene subidas a medias.

## Verificación de la restauración

Un backup que no se ha restaurado nunca es una hipótesis. Al menos una vez por
trimestre, sobre un entorno desechable:

1. Restaurar el dump más reciente y el volumen de archivos.
2. `corepack pnpm exec prisma migrate deploy`.
3. Arrancar y comprobar `GET /health/ready`.
4. `GET /api/public/home` devuelve el perfil y los destacados.
5. Descargar un archivo público y comprobar que el contenido es correcto.
6. Iniciar sesión en el panel.

## Coherencia entre base de datos y disco

Si los dos backups se restauran desde momentos distintos, pueden quedar filas sin
archivo o archivos sin fila. El barrido los reconcilia:

```bash
corepack pnpm storage:sweep
```

Borra los archivos sin fila e **informa** de las filas sin archivo sin tocarlas: esas
pueden estar referenciadas por trabajos o cursos, y qué hacer con ellas es una decisión
de una persona.
