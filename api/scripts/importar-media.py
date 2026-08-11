#!/usr/bin/env python3
"""
Sube los archivos exportados de Strapi y los engancha a su contenido.

La carpeta de origen usa la ruta como identificador:

    media/<coleccion>/<registro>/<campo>/<fichero>

y el <registro> es el slug de Strapi, truncado a 58 caracteres. Nuestros slugs son los
mismos sin truncar, asi que se cruzan por prefijo.

Todo pasa por `POST /api/admin/media/upload`, no por el disco: asi cada archivo recibe
su verificacion de tipo real, su checksum y su fila en `media_assets`. Copiarlos a mano
al almacenamiento dejaria ficheros que la plataforma no conoce.

**Es idempotente.** Antes de subir mira si ya hay un archivo con ese nombre, y antes de
enganchar mira si el destino ya lo tiene.

Uso:

    # En local, contra el sitio de desarrollo
    python3 scripts/importar-media.py --origen /ruta/a/media

    # Contra produccion, con las credenciales por entorno
    ADMIN_EMAIL=... ADMIN_PASSWORD=... \
      python3 scripts/importar-media.py --sitio https://jc2.ejemplo.edu --origen ./media

    # Sin escribir nada, solo para ver que haria
    python3 scripts/importar-media.py --dry-run --origen ./media
"""

import json
import mimetypes
import os
import re
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from http.cookiejar import CookieJar

def argumento(nombre: str, defecto: str | None = None) -> str | None:
    """`--nombre valor`, o la variable de entorno en mayusculas, o el defecto."""
    if f"--{nombre}" in sys.argv:
        return sys.argv[sys.argv.index(f"--{nombre}") + 1]
    return os.environ.get(nombre.upper().replace("-", "_"), defecto)


# Donde se importa. En produccion se pasa la direccion real:
#
#   python3 scripts/importar-media.py --sitio https://jc2.ejemplo.edu --origen ./media
SITIO = (argumento("sitio", "http://localhost:3000") or "").rstrip("/")
SECO = "--dry-run" in sys.argv

resumen: dict[str, int] = {}
avisos: list[str] = []


def anotar(que: str) -> None:
    resumen[que] = resumen.get(que, 0) + 1


# Las credenciales salen del entorno; si no estan, del .env local. En produccion se
# pasan por entorno para no dejarlas en ningun fichero:
#
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... python3 scripts/importar-media.py --sitio ...
valores = {}
try:
    for linea in open(Path(__file__).resolve().parents[2] / ".env"):
        if "=" in linea and not linea.strip().startswith("#"):
            clave, _, valor = linea.partition("=")
            valores[clave.strip()] = valor.strip()
except FileNotFoundError:
    pass
for clave in ("ADMIN_EMAIL", "ADMIN_PASSWORD"):
    if os.environ.get(clave):
        valores[clave] = os.environ[clave]

ORIGEN = Path(
    argumento("origen") or Path(__file__).resolve().parents[2] / "media"
).expanduser()

tarro = CookieJar()
nav = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(tarro))


def pedir(metodo, ruta, cuerpo=None, reintentos=6):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    cabeceras = {"Origin": SITIO}
    if datos:
        cabeceras["Content-Type"] = "application/json"
    peticion = urllib.request.Request(SITIO + ruta, data=datos, headers=cabeceras, method=metodo)
    try:
        with nav.open(peticion) as respuesta:
            contenido = respuesta.read()
            return respuesta.status, (json.loads(contenido) if contenido else None)
    except urllib.error.HTTPError as error:
        contenido = error.read()
        if error.code == 429 and reintentos > 0:
            espera = int(error.headers.get("Retry-After") or 0) + 2
            print(f"  (limite alcanzado, esperando {espera}s)")
            time.sleep(espera)
            return pedir(metodo, ruta, cuerpo, reintentos - 1)
        try:
            return error.code, json.loads(contenido)
        except Exception:
            return error.code, contenido


def subir(ruta: Path, purpose: str, reintentos=6):
    """Multipart a mano: este entorno no tiene dependencias externas."""
    limite = f"----{uuid.uuid4().hex}"
    tipo = mimetypes.guess_type(ruta.name)[0] or "application/octet-stream"
    cuerpo = b""
    for campo, valor in (("purpose", purpose), ("visibility", "public")):
        cuerpo += f'--{limite}\r\nContent-Disposition: form-data; name="{campo}"\r\n\r\n{valor}\r\n'.encode()
    cuerpo += (
        f'--{limite}\r\nContent-Disposition: form-data; name="file"; filename="{ruta.name}"\r\n'
        f"Content-Type: {tipo}\r\n\r\n"
    ).encode()
    cuerpo += ruta.read_bytes()
    cuerpo += f"\r\n--{limite}--\r\n".encode()

    peticion = urllib.request.Request(
        SITIO + "/api/admin/media/upload",
        data=cuerpo,
        headers={"Origin": SITIO, "Content-Type": f"multipart/form-data; boundary={limite}"},
        method="POST",
    )
    try:
        with nav.open(peticion) as respuesta:
            return respuesta.status, json.loads(respuesta.read())
    except urllib.error.HTTPError as error:
        contenido = error.read()
        if error.code == 429 and reintentos > 0:
            espera = int(error.headers.get("Retry-After") or 0) + 2
            print(f"  (limite alcanzado, esperando {espera}s)")
            time.sleep(espera)
            return subir(ruta, purpose, reintentos - 1)
        try:
            return error.code, json.loads(contenido)
        except Exception:
            return error.code, contenido


# ---------------------------------------------------------------------------
# Que es cada cosa
# ---------------------------------------------------------------------------

# Los PDF van como `document`; el resto de imagenes como `image`. El proposito decide
# que extensiones acepta la API.
def proposito(ruta: Path) -> str:
    return "document" if ruta.suffix.lower() == ".pdf" else "image"


# Textos alternativos. Una imagen decorativa lleva alt vacio a proposito: describirla a
# quien usa un lector de pantalla solo mete ruido. Las que si dicen algo lo llevan.
ALT = {
    "people": "Portrait of {nombre}",
    "institutions": "{nombre} logo",
    "courses": "",
    "publications": "",
    "events": "",
}


def limpiar(texto: str) -> str:
    """El nombre de Strapi, sin su hash y con los guiones bajos deshechos."""
    base = re.sub(r"_[0-9a-f]{10}$", "", texto)
    return base.replace("_", " ").strip()


def main() -> None:
    print(f"Importando los archivos de Strapi{' (SIMULACION)' if SECO else ''}\n")

    print(f"  sitio:  {SITIO}")
    print(f"  origen: {ORIGEN}\n")

    if not ORIGEN.is_dir():
        print(f"No existe la carpeta de origen: {ORIGEN}")
        print("Pasala con --origen /ruta/a/media")
        sys.exit(1)

    if not valores.get("ADMIN_EMAIL") or not valores.get("ADMIN_PASSWORD"):
        print("Faltan ADMIN_EMAIL y ADMIN_PASSWORD. Pasalas por entorno.")
        sys.exit(1)

    estado, _ = pedir(
        "POST",
        "/api/admin/auth/sign-in/email",
        {"email": valores["ADMIN_EMAIL"], "password": valores["ADMIN_PASSWORD"]},
    )
    if estado != 200:
        print(f"No se pudo iniciar sesion: {estado}")
        sys.exit(1)

    # --- Lo que ya hay, para no repetir -------------------------------------
    subidos = {}
    if not SECO:
        # `page_size` esta topado en 100 por la API: se recorren las paginas.
        pagina = 1
        while True:
            _, lista = pedir("GET", f"/api/admin/media?page_size=100&page={pagina}")
            for archivo in lista["data"]:
                subidos[archivo["originalFilename"]] = archivo["id"]
            if pagina >= lista["meta"]["pagination"]["totalPages"]:
                break
            pagina += 1

    def asegurar(ruta: Path) -> str | None:
        """Sube el archivo si no estaba. Devuelve su identificador."""
        if ruta.name in subidos:
            anotar("archivo ya estaba")
            return subidos[ruta.name]
        if SECO:
            print(f"  subiria {ruta.relative_to(ORIGEN)}")
            anotar("archivo subido")
            return "00000000-0000-0000-0000-000000000000"

        estado, respuesta = subir(ruta, proposito(ruta))
        if estado not in (200, 201):
            codigo = (respuesta or {}).get("error", {}).get("code", estado)
            avisos.append(f"{ruta.relative_to(ORIGEN)}: {codigo}")
            anotar(f"rechazado por la API ({codigo})")
            return None

        ident = respuesta["data"]["id"]
        subidos[ruta.name] = ident
        anotar("archivo subido")
        return ident

    def por_prefijo(coleccion: dict[str, dict], carpeta: str):
        """Nuestro slug contra el de Strapi.

        El de Strapi viene truncado a 58 caracteres, asi que se compara por prefijo. Y
        se le quita el articulo inicial: Strapi guardo la institucion como
        `the-university-of-queensland` y aqui es `university-of-queensland`.
        """

        def normalizar(valor: str) -> str:
            return re.sub(r"^the-", "", valor)

        objetivo = normalizar(carpeta)
        for slug, registro in coleccion.items():
            propio = normalizar(slug)
            if propio.startswith(objetivo) or objetivo.startswith(propio):
                return registro
        return None

    # --- Registros de destino -------------------------------------------------
    def indexar(ruta, clave="slug"):
        _, r = pedir("GET", ruta)
        return {x[clave]: x for x in r["data"]}

    works = indexar("/api/admin/works?page_size=100")
    courses = indexar("/api/admin/courses?page_size=100")
    events = indexar("/api/admin/events?page_size=100")
    instituciones = indexar("/api/admin/institutions?page_size=100")
    _, personas = pedir("GET", "/api/admin/persons?page_size=100")
    titular = next((p for p in personas["data"] if p["isSiteOwner"]), None)

    # --- 1. El retrato del titular -------------------------------------------
    print("1. Retrato")
    for foto in sorted((ORIGEN / "people").rglob("*")):
        if not foto.is_file():
            continue
        ident = asegurar(foto)
        if ident is None or titular is None or SECO:
            continue
        if titular.get("photoMediaId") == ident:
            anotar("retrato ya asignado")
            continue
        pedir("PATCH", f"/api/admin/media/{ident}", {"altText": f"Portrait of {titular['fullName']}"})
        pedir("PATCH", f"/api/admin/persons/{titular['id']}", {"photoMediaId": ident})
        anotar("retrato asignado")

    # --- 2. Logotipos de institucion -----------------------------------------
    print("2. Logotipos")
    for carpeta in sorted((ORIGEN / "institutions").iterdir()):
        registro = por_prefijo(instituciones, carpeta.name)
        for archivo in sorted(carpeta.rglob("*")):
            if not archivo.is_file():
                continue
            ident = asegurar(archivo)
            if ident is None or registro is None or SECO:
                if registro is None:
                    avisos.append(f"sin institucion para {carpeta.name}")
                continue
            if registro.get("logoMediaId") == ident:
                anotar("logotipo ya asignado")
                continue
            pedir("PATCH", f"/api/admin/media/{ident}", {"altText": f"{registro['name']} logo"})
            pedir("PATCH", f"/api/admin/institutions/{registro['id']}", {"logoMediaId": ident})
            anotar("logotipo asignado")

    # --- 3. Portadas de curso -------------------------------------------------
    print("3. Portadas de curso")
    for carpeta in sorted((ORIGEN / "courses").iterdir()):
        registro = por_prefijo(courses, carpeta.name)
        for archivo in sorted(carpeta.rglob("*")):
            if not archivo.is_file():
                continue
            ident = asegurar(archivo)
            if ident is None or registro is None or SECO:
                if registro is None:
                    avisos.append(f"sin curso para {carpeta.name}")
                continue
            if registro.get("coverMediaId") == ident:
                anotar("portada de curso ya asignada")
                continue
            pedir("PATCH", f"/api/admin/courses/{registro['id']}", {"coverMediaId": ident})
            anotar("portada de curso asignada")

    # --- 4. Imagenes de evento ------------------------------------------------
    print("4. Imagenes de evento")
    for carpeta in sorted((ORIGEN / "events").iterdir()):
        registro = por_prefijo(events, carpeta.name)
        for archivo in sorted(carpeta.rglob("*")):
            if not archivo.is_file():
                continue
            ident = asegurar(archivo)
            if ident is None or registro is None or SECO:
                if registro is None:
                    avisos.append(f"sin evento para {carpeta.name}")
                continue
            if registro.get("imageMediaId") == ident:
                anotar("imagen de evento ya asignada")
                continue
            pedir(
                "PATCH",
                f"/api/admin/events/{registro['id']}",
                {"imageMediaId": ident, "imageAlt": registro["title"]},
            )
            anotar("imagen de evento asignada")

    # --- 5. Publicaciones: portada y PDF -------------------------------------
    print("5. Publicaciones")
    for carpeta in sorted((ORIGEN / "publications").iterdir()):
        registro = por_prefijo(works, carpeta.name)
        if registro is None:
            avisos.append(f"sin publicacion para {carpeta.name}")
            continue

        detalle = None if SECO else pedir("GET", f"/api/admin/works/{registro['id']}")[1]["data"]

        for campo in ("cover", "document"):
            for archivo in sorted((carpeta / campo).glob("*")) if (carpeta / campo).is_dir() else []:
                ident = asegurar(archivo)
                if ident is None or SECO:
                    continue

                if campo == "cover":
                    if detalle.get("coverMediaId") == ident:
                        anotar("portada ya asignada")
                        continue
                    pedir("PATCH", f"/api/admin/works/{registro['id']}", {"coverMediaId": ident})
                    anotar("portada de publicacion asignada")
                else:
                    # El PDF va como archivo del trabajo, que es lo que el sitio
                    # publico ofrece descargar en la ficha.
                    if any(f["mediaId"] == ident for f in detalle.get("files", [])):
                        anotar("PDF ya asignado")
                        continue
                    archivos = [
                        {
                            "mediaId": f["mediaId"],
                            "fileType": f["fileType"],
                            "label": f["label"],
                            "versionLabel": f["versionLabel"],
                            "sortOrder": f["sortOrder"],
                            "isPublic": f["isPublic"],
                        }
                        for f in detalle.get("files", [])
                    ]
                    archivos.append(
                        {
                            "mediaId": ident,
                            "fileType": "paper_pdf",
                            "label": limpiar(archivo.stem),
                            "sortOrder": len(archivos),
                            "isPublic": True,
                        }
                    )
                    estado, _ = pedir(
                        "PATCH", f"/api/admin/works/{registro['id']}", {"files": archivos}
                    )
                    if estado == 200:
                        detalle["files"] = archivos
                        anotar("PDF de publicacion asignado")
                    else:
                        avisos.append(f"no se pudo enganchar {archivo.name}: {estado}")

    # --- 6. Materiales de la edicion de curso --------------------------------
    print("6. Materiales de curso")
    for carpeta in sorted((ORIGEN / "course-instances").iterdir()):
        # La unica edicion con nombre es "2019", la de Intermediate Microeconomics.
        curso = courses.get("intermediate-microeconomics")
        if curso is None:
            avisos.append("no se encontro Intermediate Microeconomics")
            continue

        detalle = None if SECO else pedir("GET", f"/api/admin/courses/{curso['id']}")[1]["data"]
        edicion = (
            None
            if SECO
            else next((e for e in detalle["offerings"] if e["name"] == carpeta.name), None)
        )
        if edicion is None and not SECO:
            avisos.append(f"sin edicion {carpeta.name} en {curso['title']}")
            continue

        # No hay GET de materiales: vienen dentro del detalle del curso, que ya se
        # ha pedido arriba.
        existentes = [] if SECO else edicion.get("materials", [])

        for indice, archivo in enumerate(sorted(carpeta.rglob("*"))):
            if not archivo.is_file():
                continue
            ident = asegurar(archivo)
            if ident is None or SECO:
                continue
            if any(m["mediaId"] == ident for m in existentes):
                anotar("material ya asignado")
                continue
            estado, _ = pedir(
                "POST",
                "/api/admin/course-materials",
                {
                    "courseOfferingId": edicion["id"],
                    "mediaId": ident,
                    "materialType": "reading",
                    "title": limpiar(archivo.stem),
                    "sortOrder": indice,
                    "isPublic": True,
                },
            )
            if estado in (200, 201):
                anotar("material de curso asignado")
            else:
                avisos.append(f"no se pudo enganchar {archivo.name}: {estado}")

    # --- 7. El resto: a la biblioteca, sin asignar ---------------------------
    #
    # Las cenefas Moche de las paginas y el pie, el patron del encabezado y lo que
    # Strapi tenia sin usar. Se suben para que esten disponibles desde el panel, pero
    # no se enganchan: ver el informe.
    print("7. Biblioteca")
    for carpeta in ("hero-profile", "hero-research", "hero-teaching", "home", "footer",
                    "social-networks", "_sin-referencia"):
        raiz = ORIGEN / carpeta
        if not raiz.is_dir():
            continue
        for archivo in sorted(raiz.rglob("*")):
            if archivo.is_file():
                asegurar(archivo)

    print("\nResumen:")
    for que, cuantos in sorted(resumen.items()):
        print(f"  {cuantos:3d}  {que}")
    if avisos:
        print("\nAvisos:")
        for aviso in sorted(set(avisos)):
            print(f"  - {aviso}")


main()
