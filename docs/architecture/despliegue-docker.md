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

**Ningun contenedor publica puerto en el anfitrion.** Quien termina TLS y enruta por
dominio es el proxy —Traefik en Dokploy—, y llega por la red de Docker. La API tampoco
se expone: se llega a ella por el proxy de nginx que va dentro de `web`. Es lo que
mantiene un unico origen para el sitio y la API, de lo que dependen la cookie de sesion
y la cabecera `Cross-Origin-Resource-Policy` de las imagenes.

`web` se une a `dokploy-network`, que es externa. **Fuera de Dokploy hay que crearla:**

```bash
docker network create dokploy-network
```

Sin ella, `docker compose up` falla diciendo que la red no existe. Con proxy propio, se
apunta a `web:80` dentro de esa misma red.

`migrate` es una imagen aparte a proposito: lleva el CLI de Prisma, que es dependencia
de desarrollo. Un contenedor que sirve peticiones no tiene por que poder migrar la base.

Si `migrate` falla, `api` **no arranca**: `condition: service_completed_successfully`.
Asi una migracion rota no deja en pie una version incompatible con la base.

## Antes de levantarlo

**Hace falta HTTPS.** La cookie de sesion es `Secure` y no viaja por HTTP: sin TLS se
puede ver el sitio publico, pero **no se puede entrar al panel**. Delante va un proxy que
termine TLS —Traefik en Dokploy, o Caddy por tu cuenta— apuntando a `web:80` dentro de
`dokploy-network`.

`PUBLIC_BASE_URL` tiene que ser la direccion real por la que llega el navegador, con
`https` y sin barra final. De ahi salen el origen de CORS, el de la cookie, el sitemap,
los enlaces canonicos y las direcciones de los archivos publicos. Si no coincide, no se
inicia sesion.

**La base es externa.** Desde un contenedor `localhost` es el propio contenedor: para una
base en la misma maquina se usa `host.docker.internal`, que el compose ya resuelve —lleva
`extra_hosts` en `migrate` y en `api`—, o la IP de la interfaz del anfitrion. Con TLS,
`?sslmode=require`.

## El volumen de archivos

`jc2-storage` guarda lo que se sube desde el panel. **Sin el, cada redespliegue borra los
archivos** y las filas de `media_assets` quedan apuntando al vacio. Es un volumen con
nombre: sobrevive a `docker compose down`.

La base y los archivos son **dos copias de seguridad, no una**. Restaurar solo una deja
el sistema incoherente; ver `backups.md`.

## El contenido inicial

El primer despliegue deja el sitio con contenido: 16 publicaciones, 10 personas, 6
revistas, 2 instituciones, 3 cursos, 5 eventos, la trayectoria del titular, 3 noticias,
2 entradas de blog y los textos de las seis paginas.

**Las noticias y las entradas de blog son de relleno**, escritas para que el sitio no
nazca con dos paginas vacias. Estan publicadas, asi que salen en el menu y en el sitemap
desde el primer minuto: conviene revisarlas o borrarlas desde el panel antes de anunciar
la direccion. Borrar una no la resucita en el siguiente despliegue —este seeder solo
siembra una base vacia—.

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
  en un fichero de codigo. Ver el apartado siguiente.
- **`publicBaseUrl`.** Es propia de cada instalacion: la fija `PUBLIC_BASE_URL`. Copiarla
  dejaria el sitemap apuntando a la maquina de desarrollo.

## Los archivos, despues del primer despliegue

El seeder deja el sitio **sin imagenes ni PDF**: el retrato, los logotipos, las portadas,
los documentos de las publicaciones y los materiales de curso son ficheros, y los
ficheros no viajan en el repositorio —estan en `.gitignore`— ni en el seeder.

Se llevan con el mismo script que los importo, apuntando a produccion:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... \
  python3 api/scripts/importar-media.py \
    --sitio https://tu-dominio \
    --origen /ruta/a/media
```

Sube cada fichero por la API —con su verificacion de tipo y su checksum— y lo engancha a
su registro cruzando por slug. Es **idempotente**: si algo ya estaba, lo dice y sigue.
Anade `--dry-run` para ver que haria sin escribir nada.

Hay que ejecutarlo **despues** de que el seeder haya creado el contenido: el script busca
la publicacion o el curso al que enganchar cada archivo.

Los ficheros acaban en el volumen `jc2-storage`, no en la imagen, asi que sobreviven al
redespliegue.

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

## Antes de tocar `.gitignore`

**Un patron de carpeta sin barra inicial casa a cualquier profundidad.** `storage/`
excluyo `api/src/infrastructure/storage/`, que es codigo fuente: seis ficheros no
llegaron al repositorio y el build fallaba solo en el servidor, que compila desde el
clon, mientras en local seguia pasando porque los ficheros estaban en disco.

Lo que lo detecta en un segundo:

```bash
comm -23 <(find api/src web/src -type f \( -name '*.ts' -o -name '*.tsx' \) \
            | grep -v prisma/generated | sort) \
         <(git ls-files api/src web/src | sort)
```

Vacio significa que el repositorio tiene todo el codigo. Conviene mirarlo despues de
cualquier cambio en un `.gitignore`.

## Cuando `migrate` falla

El log dice donde se paro, y el sitio exacto importa:

| Lo que se ve | Que pasa |
|---|---|
| No llega a listar las migraciones. `P1001: Can't reach database server` | La base no es alcanzable desde el contenedor. Recuerda que `localhost` es el propio contenedor. |
| Lista las migraciones y falla con `permission denied for schema public` | Conecta, pero el usuario no puede crear objetos. Ver abajo. |
| `P3009: migrate found failed migrations` | Un intento anterior dejo una migracion a medias. Hay que resolverla antes de reintentar. |

**Prisma no lista las migraciones hasta despues de conectar.** Si en el log aparecen
todas con su `migration.sql`, la conexion funciona y el problema es otro. El numero no se
escribe aqui a proposito: crece con cada cambio de esquema y un numero desactualizado en
una guia de incidencias hace dudar de lo que se esta viendo.

### La contrasena llega cortada

`ADMIN_PASSWORD: Too small: expected string to have >=12 characters` no siempre
significa que sea corta. **Un `$` sin escapar la trunca**: en un fichero de entorno
`Clave$Segura2026` se lee como `Clave` mas una variable vacia, y llegan 5 caracteres.

Por eso el error dice cuantos caracteres llegaron. Si el numero no cuadra con lo que
escribiste, el valor viene cortado. Generar una sin caracteres especiales lo evita:

```bash
openssl rand -hex 24
```

### Permisos en la base

Desde PostgreSQL 15 el esquema `public` ya no concede `CREATE` a todo el mundo, asi que
un usuario recien creado conecta pero no puede crear tablas. Lo mas simple es que sea
dueño de la base:

```sql
ALTER DATABASE mibase OWNER TO miusuario;
```

O, si prefieres no darle la propiedad:

```sql
GRANT ALL ON SCHEMA public TO miusuario;
```

Cuidado: con `GRANT` sobre el esquema pero sin ser dueño de la base, la primera migracion
avanza y luego falla con `P3018 / permission denied for database`. Comprobado.

### Migraciones a medias

`P3009` aparece cuando un intento anterior dejo una migracion marcada como fallida. La
base guarda ese registro y no deja seguir. Se marca como revertida y se reintenta:

```bash
docker compose run --rm --entrypoint sh migrate -c \
  "node node_modules/prisma/build/index.js migrate resolve --rolled-back NOMBRE_DE_LA_MIGRACION"
```

Si la base estaba vacia y no llego a crearse nada, lo mas limpio es vaciarla y volver a
empezar.

## Comprobar un despliegue

### En Dokploy

En **General → Compose Path**: `./docker-compose.yml`, el de la raiz. El otro fichero,
`api/docker-compose.dev.yml`, es un Postgres para trabajar en local y no tiene los
servicios de la aplicacion: elegirlo falla con *"service web does not exist in the
compose"*.

En **Domains**: servicio `web`, **Container Port 80** (no 3000: nginx escucha en el 80) y
**HTTPS encendido**. Sin certificado se ve el sitio publico pero no se entra al panel,
porque la cookie de sesion es `Secure`.

En **Environment** van todas las variables: el `.env.production` no viaja en el
repositorio —esta en `.gitignore`— y el compose usa interpolacion estricta
(`${VAR:?falta VAR}`), asi que sin ellas aborta antes de construir.

```bash
curl -sI https://tu-dominio/ | grep -i content-security-policy   # cabeceras
curl -s  https://tu-dominio/api/public/site | head -c 200        # la API responde
curl -s  https://tu-dominio/sitemap.xml | grep -c '<url>'        # el contenido esta
docker compose logs migrate | tail -20                           # migro y sembro
```

Y entrar al panel en **`/sign-in`** con las credenciales del `.env`. El panel vive bajo
`/admin`, pero la pantalla de acceso no: esta fuera del guard, porque un guard que
protege su propia puerta no deja entrar a nadie.
