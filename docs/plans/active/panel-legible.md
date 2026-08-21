# El panel, más fácil de leer

## Goal

Que administrar el sitio deje de cansar. Tres quejas del titular, en sus palabras: el
menú lateral cuesta leerlo, la configuración está mezclada con el contenido, y los
formularios son largos y llenos de texto. Se añade una cuarta que sale de la auditoría y
que él nota sin saber nombrarla: **el panel está a medias en dos idiomas**.

## Lo que se midió

No son impresiones: son medidas sobre el panel en marcha.

### El menú lateral

| | |
|---|---|
| Entradas | **23**, en 8 grupos |
| Alto del contenido | **1200 px** en 756 px visibles |
| Consecuencia | **se cortan 444 px**: News, Blog, Website y System sólo se alcanzan con scroll |
| Alto por entrada | 52 px |

El contraste **no** es el problema: 12,4:1 el texto y 4,85:1 los rótulos de grupo en
tema claro; 15,8:1 y 8,3:1 en oscuro. Todo pasa AA. Lo que cuesta es **la longitud**: 23
entradas del mismo peso visual, y las últimas fuera de pantalla.

### La configuración, mezclada con el contenido

Seis pantallas que no son contenido sino vocabulario del sistema, hoy repartidas entre
los grupos *Research* y *System*:

| Pantalla | Filas reales | Dónde está hoy |
|---|---|---|
| Work types | 12 | Research |
| Academic statuses | 9 | Research |
| Venues | 6 | Research |
| Citation styles | 6 | Research |
| Tags | 25 | Research |
| Catalogues | 66 términos, 9 vocabularios | System |

*Research* tiene **7 entradas**, de las que sólo dos —Work y Authors— son contenido. Las
otras cinco se tocan una vez al año.

### Los formularios

| Formulario | Alto | Pantallas de scroll | Campos | Bloques | Párrafos de ayuda |
|---|---|---|---|---|---|
| Publicación | **2893 px** | **3,2** | 20 | 9 | 14 |
| Evento | 1579 px | 1,8 | 15 | 5 | 7 |
| Curso | 1097 px | 1,2 | 7 | 3 | 7 |

Nueve bloques para veinte campos: cada bloque gasta un título, una línea de ayuda y su
propio marco. El de publicación tiene además un campo —«Order in Research»— cuya ayuda
se pinta en una columna de 100 px y sale en ocho líneas rotas.

### El idioma

**27 rótulos y mensajes en castellano** dentro de un panel escrito en inglés, en 13
módulos. En el mismo formulario de publicación conviven *Title* y *Subtitulo*, *Pages* y
*Volumen*, *Publication year* y *Codigo de descarga*, *Files* y *Elegir subido*. Eso es
la mitad de por qué «cuesta leerlo»: el ojo cambia de idioma cada dos campos.

*(Los comentarios del código sí van en castellano, y así se quedan: es la convención del
repositorio y no lo lee ningún usuario.)*

### El texto enriquecido

11 campos guardan Markdown y se editan en un `<textarea>` pelado. Lo más largo que hay
escrito hoy son 953 caracteres (un abstract). No hay ninguna librería de editor
instalada.

## Decisions

- **El formato guardado sigue siendo Markdown.** El servidor lo convierte y lo sanea en
  un único sitio (ERS §37); un editor que devuelva HTML obligaría a sanear entrada en
  lugar de salida y a reescribir esa garantía. El editor es sólo una forma más cómoda de
  escribir lo mismo.
- **Configuración es un destino, no un grupo.** Una sola entrada en el menú que abre una
  pantalla con las seis secciones dentro. Seis entradas que se tocan una vez al año no
  merecen seis sitios en una lista que ya no cabe.
- **Menos bloques, no menos campos.** Nadie pidió quitar información: lo que sobra es el
  marco alrededor de cada grupo de dos campos.
- **La ayuda se gana el sitio o desaparece.** Una línea que repite lo que dice la
  etiqueta —«Title: el título»— es ruido. Se queda la que avisa de algo que no se puede
  adivinar.
- **Un solo idioma: inglés.** Es en el que está el 90 % del panel y el sitio público
  entero.

## Tasks

### Fase 1 — El idioma, de una vez

- [ ] Traducir los 27 rótulos y mensajes al inglés, módulo por módulo.
- [ ] Una prueba que falle si vuelve a colarse uno: la misma lista de palabras con la
      que se midieron.

Va primero porque es lo más barato de todo y arregla la mitad de la fatiga sin mover una
sola caja de sitio.

### Fase 2 — El menú lateral

- [ ] **Configuración pasa a ser una entrada**, con Work types, Academic statuses,
      Venues, Citation styles, Tags y Catalogues dentro. El menú baja de 23 entradas a
      **18** y de 8 grupos a 6.
- [ ] Comprobar contra la ventana: el contenido tiene que caber sin scroll en 756 px.
- [ ] Los grupos se distinguen por separación, no sólo por un rótulo de 12 px.

### Fase 3 — La pantalla de Configuración

- [ ] Una pantalla con las seis secciones, cada una con su tabla y su diálogo, tal como
      están hoy. **No se reescriben**: se recolocan.
- [ ] Las direcciones viejas siguen funcionando y llevan a su sección: hay enlaces
      guardados y el panel no debe romperlos.

### Fase 4 — Los formularios largos

- [ ] Publicación baja de 9 bloques a 4: **Lo básico**, **Contenido**, **Dónde se
      publicó**, **Material** (autores, etiquetas, enlaces, archivos, cita).
- [ ] Lo que casi nadie toca —cita manual, BibTeX, código de descarga, orden— va a un
      bloque plegado, cerrado por defecto.
- [ ] Cada ayuda se lee y se decide: se queda, se acorta o se va.
- [ ] Arreglar la ayuda del campo de orden, que hoy sale en ocho líneas rotas.
- [ ] Objetivo medible: **por debajo de 2 pantallas** de scroll, hoy 3,2.
- [ ] Lo mismo con Evento (1,8) y Curso (1,2), que están mejor pero repiten el patrón.

### Fase 5 — El texto enriquecido

- [ ] Editor sobre los 11 campos Markdown: negrita, cursiva, títulos, listas, enlaces y
      cita. Nada más: lo que el saneador del servidor ya permite.
- [ ] Sigue guardando Markdown. Se comprueba con el texto que ya hay escrito.
- [ ] El botón de insertar imagen del blog se integra en la barra del editor.
- [ ] Decidir la librería con el titular antes de instalarla: es una dependencia nueva
      y pesa.

## Verification

- `corepack pnpm verify` en `web/` al cerrar cada fase.
- Fase 1: el barrido de las 22 pantallas del panel, sin una sola cadena de la lista.
- Fase 2: medida del alto del menú contra la ventana, en las dos alturas de pantalla más
  comunes.
- Fase 3: las seis secciones abren, guardan y borran; las direcciones viejas siguen
  llevando a su sitio.
- Fase 4: alto de cada formulario medido antes y después, en píxeles.
- Fase 5: escribir en el editor, guardar, y comprobar que lo guardado es el mismo
  Markdown que se ve renderizado en la web.
- Al terminar cada fase: barrido del navegador sin errores de consola, y los datos de
  prueba retirados.
