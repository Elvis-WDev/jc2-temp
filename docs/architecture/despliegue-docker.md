# Despliegue con Docker

Se despliega **solo la aplicacion**. La base de datos es externa y se conecta por
`DATABASE_URL`.

```bash
cp .env.production.example .env.production   # y se rellena
docker compose --env-file .env.production up -d --build
```

## Las tres piezas

| Servicio | Imagen | Que hace |
|---|---|---|
| `migrate` | `jc2-migrate` | Se ejecuta una vez y termina: aplica migraciones y siembra. |
| `api` | `jc2-api` | La API. No arranca hasta que `migrate` termina bien. |
| `web` | `jc2-web` | nginx: sirve el sitio y hace de unica puerta, con `/api` por dentro. |

**Solo `web` publica puerto**, y por defecto solo en `127.0.0.1:8080`. La API no se
expone: se llega a ella por el proxy de nginx. Es lo que mantiene un unico origen para
el sitio y la API, que es de lo que dependen la cookie de sesion y la cabecera
`Cross-Origin-Resource-Policy` de las imagenes.

`migrate` es una imagen aparte a proposito: lleva el CLI de Prisma, que es dependencia
de desarrollo. Un contenedor que sirve peticiones no tiene por que poder migrar la base.

Si `migrate` falla, `api` **no arranca**: `condition: service_completed_successfully`.
Asi una migracion rota no deja en pie una version incompatible con la base.

## Antes de levantarlo

**Hace falta HTTPS.** La cookie de sesion es `Secure` y no viaja por HTTP: sin TLS se
puede ver el sitio publico, pero **no se puede entrar al panel**. Delante va un proxy que
termine TLS (Caddy, Traefik, el nginx del anfitrion) apuntando a `127.0.0.1:8080`.

`PUBLIC_BASE_URL` tiene que ser la direccion real por la que llega el navegador, con
`https` y sin barra final. De ahi salen el origen de CORS, el de la cookie, el sitemap,
los enlaces canonicos y las direcciones de los archivos publicos. Si no coincide, no se
inicia sesion.

**La base es externa.** Desde un contenedor `localhost` es el propio contenedor: para una
base en la misma maquina se usa `host.docker.internal` (con `extra_hosts`) o la IP de la
interfaz del anfitrion. Con TLS, `?sslmode=require`.

## El volumen de archivos

`jc2-storage` guarda lo que se sube desde el panel. **Sin el, cada redespliegue borra los
archivos** y las filas de `media_assets` quedan apuntando al vacio. Es un volumen con
nombre: sobrevive a `docker compose down`.

La base y los archivos son **dos copias de seguridad, no una**. Restaurar solo una deja
el sistema incoherente; ver `backups.md`.

## El contenido inicial

El primer despliegue deja el sitio con contenido: 16 publicaciones, 10 personas, 6
revistas, 2 instituciones, 3 cursos, 5 eventos y los textos de las cuatro paginas.

Lo trae `src/infrastructure/database/seed/contenido.seed.ts`, que lee un fichero de datos
**generado**:

```bash
# Se ejecuta a mano cuando se quiera actualizar el contenido inicial.
corepack pnpm exec tsx --env-file=../.env scripts/generar-seed-contenido.ts
```

**Solo siembra una base vacia.** Si ya hay alguna publicacion, no toca nada y registra
`skipped`. Es lo que separa un seeder inicial de uno que pisa el trabajo del titular: si
borro una publicacion, el siguiente despliegue no debe resucitarla.

Los otros seeders —catalogos, tipos de trabajo, textos de pagina, configuracion— si son
idempotentes fila a fila, porque describen la estructura de la plataforma y no su
contenido. Se pueden repetir en cada despliegue.

Lo que el contenido inicial **no** lleva:

- **Los identificadores.** Todo se relaciona por clave natural, para que cada instalacion
  genere sus propios UUID.
- **Los archivos subidos.** `media_assets` guarda una ruta en disco y el binario no cabe
  en un fichero de codigo. Retratos, portadas y PDF se suben desde el panel.
- **`publicBaseUrl`.** Es propia de cada instalacion: la fija `PUBLIC_BASE_URL`. Copiarla
  dejaria el sitemap apuntando a la maquina de desarrollo.

## Las credenciales

`ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME` crean el unico administrador en el primer
despliegue. El hash lo produce Better Auth; este proyecto no implementa criptografia.

**Si el correo ya existe, el seeder no toca la contrasena.** Cambiarla en el `.env`
despues no sirve de nada: se cambia desde el panel.

## Actualizar

```bash
git pull
docker compose --env-file .env.production up -d --build
```

`migrate` vuelve a correr, aplica lo que falte y el seeder de contenido se salta solo. El
volumen de archivos no se toca.

Para volver atras conviene etiquetar cada despliegue con `IMAGE_TAG`. Ojo: **una
migracion no se deshace sola**. Volver a una version anterior de la aplicacion con la base
ya migrada solo funciona si el cambio era aditivo, que es como estan escritas todas las
migraciones de este proyecto.

## Las cabeceras de seguridad

Viven en `web/security-headers.conf` y se **incluyen en cada bloque `location`**, no solo
en `server`. Nginx no acumula `add_header`: en cuanto un `location` declara uno, deja de
heredar los de arriba. Con las cabeceras solo en `server`, `/` se servia sin ninguna
—cae en `location = /index.html`, que fija `Cache-Control`— y los assets tampoco las
llevaban. Es un fallo silencioso: la pagina se ve igual.

`/docs` y `/openapi.json` **no se proxean**: la documentacion de la API no tiene por que
ser alcanzable desde la web publica. Piden por esas rutas y les responde la SPA con su
404.

## Comprobar un despliegue

```bash
curl -sI https://tu-dominio/ | grep -i content-security-policy   # cabeceras
curl -s  https://tu-dominio/api/public/site | head -c 200        # la API responde
curl -s  https://tu-dominio/sitemap.xml | grep -c '<url>'        # el contenido esta
docker compose logs migrate | tail -20                           # migro y sembro
```

Y entrar al panel en `/admin/sign-in` con las credenciales del `.env`.
