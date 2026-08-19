# Migraciones

Toda modificación del esquema pasa por una migración versionada (ERS §57, NFR-005). Lo
que sigue no es la teoría de Prisma, sino lo que este esquema tiene de particular.

## El aviso importante: lo que Prisma no conoce

Varias piezas del esquema están escritas a mano en las migraciones porque Prisma no sabe
expresarlas. **Prisma no las conoce, así que al generar una migración nueva propone
borrarlas.**

| Objeto | Qué respalda |
| --- | --- |
| `affiliations_department_matches_institution` | RN-006: el departamento pertenece a la institución |
| `course_offerings_department_matches_institution` | RN-006, en las ediciones de curso |
| `departments_id_institution_key` | La clave única contra la que apuntan las dos anteriores |
| `works_search_vector_idx` | El índice GIN de la búsqueda de Research |

A eso se suman los `DEFAULT` de varias columnas `updated_at` y los nombres propios de
algunas restricciones y de sus índices, que Prisma quiere renombrar.

**Al generar una migración, esas líneas se borran antes de aplicarla.** Da igual que
venga de `prisma migrate dev` o de `prisma migrate diff`: si en el `.sql` aparece un
`DROP` de cualquiera de esos cuatro nombres, o un `ALTER COLUMN ... DROP DEFAULT` que
nadie pidió, sobra.

## Por qué esto no es un aviso teórico

El 18 de agosto de 2026 se generó una migración con `prisma migrate dev` para añadir dos
columnas. La salida traía, además, el borrado de esos objetos. Al aplicarla falló a la
tercera sentencia —no se puede borrar un índice que respalda una restricción— pero **las
dos primeras ya se habían ejecutado y no se revirtieron**: la base se quedó sin las dos
claves foráneas compuestas que implementan RN-006.

De ahí la lección que conviene tener presente: **una migración no se aplica dentro de una
única transacción**. Que falle a mitad no significa que no haya pasado nada; significa que
hay que ir a mirar qué quedó a medias.

## Si una migración falla a mitad

1. Mirar el estado real de la base, no fiarse del mensaje de error. Las restricciones se
   consultan en `pg_constraint` y los índices en `pg_indexes`.
2. Restaurar a mano lo que se perdiera, copiando la definición literal de la migración
   que lo creó (las de RN-006 están en `20260810120000_init`).
3. Marcar la migración fallida como revertida:
   `prisma migrate resolve --rolled-back <nombre>`.
4. Borrar el `.sql` generado y escribir a mano uno que contenga **solo** el cambio que se
   quería hacer.
5. Aplicarlo con `prisma migrate deploy` y comprobar de nuevo el estado.

## Escribir una migración a mano

Es lo normal en este repositorio cuando el cambio es pequeño. Basta una carpeta con el
formato de fecha que usan las demás y un `migration.sql` dentro:

```
api/prisma/migrations/20260818212000_encabezado_editable_de_seccion/migration.sql
```

Encabezarla con qué hace y por qué, y decir si es aditiva. `20260818212000` sirve de
ejemplo: dos columnas opcionales y un aviso de qué líneas no incluir nunca.

## Sembrado

El seeder es idempotente de principio a fin y se ejecuta en cada despliegue. El contenido
inicial solo entra si la base está vacía, para no pisar lo del titular en un redespliegue.
