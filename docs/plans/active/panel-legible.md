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

- [x] Traducir los rótulos y mensajes al inglés, módulo por módulo.
- [x] Una prueba que falle si vuelve a colarse uno.

**Hecha.** No eran 27 sino **63**: la cifra de la auditoría salía de una lista de palabras
escrita a mano, y al barrer con una más ancha aparecieron los botones de crear de siete
diálogos, los de ocultar y mostrar de cuatro módulos, los de subir y bajar de Catálogos,
y las flechas del carrusel del sitio público, que había escrito yo.

La prueba vive fuera de `src`, en `pruebas-de-fuente/`, porque lee el código en disco y
necesita Node: `tsconfig.app.json` es configuración de navegador, y meterla dentro
obligaría a añadir los tipos de Node al código de la aplicación y a perder el aviso
cuando alguien use `process` en una pantalla. `vite.config.ts` pasa a tener dos entornos.

Mira tres formas de texto visible: cadenas entrecomilladas, texto suelto en su línea, y
texto entre etiquetas en la misma línea. **La tercera faltaba en la primera versión** y
dejaba pasar `<FormLabel>Subtitulo</FormLabel>` entero, que es la forma más común de un
rótulo; lo descubrí al comprobar la prueba rompiéndola a propósito, no antes. Con las
tres, encontró dos que se me habían escapado a mano.

Los comentarios del código siguen en castellano: es la convención del repositorio y no
los lee nadie desde la aplicación.

### Fase 2 — El menú lateral

- [x] **Configuración pasa a ser una entrada**, plegable, con las pantallas de
      vocabulario dentro.
- [x] Comprobar contra la ventana: el contenido cabe sin scroll.
- [x] Los grupos se distinguen por separación, no sólo por un rótulo de 12 px.

**Hecha.** De **22 entradas en 8 grupos** a **14 en 5**, y de 1200 px de contenido a 756:
cabe entero, sin scroll, en una ventana de 900 px de alto.

**La auditoría se equivocaba en un número, y era el importante.** Decía 52 px por entrada;
son **32**. Aquella cifra salía de dividir el alto total entre las entradas, y en el total
entraba la fila del encabezado —el nombre del sitio—, que mide 48. Con 52 px por entrada
la conclusión habría sido que ni 15 entradas caben y que había que tocar la tipografía;
con 32, sobra con reagrupar.

Lo que se hizo, por orden de lo que más ahorra:

- **Configuration**, plegable, con las ocho pantallas de vocabulario: tipos de trabajo,
  estados, revistas, estilos de cita, etiquetas, instituciones, departamentos y
  catálogos. Cada una conserva su dirección.
- **Research, Teaching, Events y News & blog** eran cuatro grupos de una, dos y tres
  entradas: cuatro rótulos para nueve destinos. Ahora son **Content**.
- **Dashboard pierde su rótulo «General»**: una sola entrada no necesita un título encima,
  y ese título costaba 40 px de los 756.

Instituciones y departamentos entran en Configuration aunque no sean «tipos ni estados»:
son dos filas y dos filas, se montan una vez y no se vuelven a tocar. Es discutible y se
mueve en una línea.

### Fase 3 — La pantalla de Configuración

- [x] Un módulo con las ocho secciones, cada una con su tabla y su diálogo, tal como
      están hoy. **No se reescriben**: se recolocan.
- [x] Las direcciones viejas siguen funcionando y llevan a su sección.

**Hecha, con un cambio de forma sobre lo planeado.** El plan decía «una pantalla con las
secciones dentro». Al abrirlo se vio que eso obligaba a juntar las ocho bajo una sola
ruta, y **las ocho guardan su página, su búsqueda y sus filtros en la dirección usando
los mismos nombres**: `page`, `q`, `active`. Compartiendo ruta, cambiar de sección
arrastraría los filtros de la anterior y un enlace a un listado filtrado dejaría de
valer, que es una propiedad que el proyecto decidió conservar (`data-tables.md:40-47`).

Así que el módulo es el marco, no la ruta: un encabezado común —«Configuration»— con una
barra de ocho pestañas, y cada sección conserva su dirección y su estado. Se comprobó:
buscar «econ» en Tags y saltar a Venues no arrastra el filtro.

Las ocho pantallas pierden su cabecera y su título propios, que ahora los pone el marco.
Ocho bloques idénticos de cabecera se quedan en uno.

En el menú, Configuration deja de ser un plegable y pasa a ser **una entrada** que lleva a
la primera sección y sigue marcada en las otras siete. Para eso el menú aprende
`activeFor`: una entrada puede representar varias direcciones.

**Una regresión que cazó la prueba, no yo:** la paleta de Ctrl+K construye su lista del
menú lateral, así que al sacar las ocho del menú dejaron de poder buscarse por su nombre.
Ahora la paleta las lista aparte, bajo su propio encabezado.

### Fase 4 — Los formularios largos

- [x] Publicación baja de 10 bloques a 4 más uno plegado.
- [x] Lo que casi nadie toca —versión, código de descarga, cita a mano, BibTeX, orden—
      va a ese bloque plegado, cerrado por defecto.
- [x] Cada ayuda se lee y se decide: de 14 quedan 7.
- [x] Arreglada la ayuda del campo de orden, que salía en ocho líneas rotas.
- [ ] Objetivo medible: por debajo de 2 pantallas. **Se queda en 2,4.**
- [x] Lo mismo con Evento y Curso. Y con Entrada, que no estaba en el plan.

Medido en 1440×900, con 828px visibles bajo la cabecera:

| Formulario | Antes | Ahora | Bloques | Ayudas |
|---|---|---|---|---|
| Publicación (edición) | 3.287px · 4,0 | 2.011px · **2,4** | 10 → 4 + 1 plegado | 14 → 7 |
| Evento | 1.687px · 2,0 | 1.545px · **1,9** | 5 → 3 | 6 → 6 |
| Curso | 1.323px · 1,6 | 1.190px · **1,4** | 3 → 2 | 7 → 3 |
| Entrada | 1.475px · 1,8 | 1.398px · **1,7** | 4 → 4 | 7 → 4 |

El «3,2 de hoy» que decía el plan no se pudo reproducir: medido de nuevo, el formulario
de Publicación en edición ocupaba **4,0 pantallas**. La reducción pedida era del 38%; la
conseguida es del 39%, sobre una cifra de partida mayor.

**El objetivo absoluto no se alcanza, y no se fuerza.** Quedan 17 campos visibles y
cuatro listas —autores, etiquetas, enlaces, archivos—; bajar de 1.656px exigía esconder
campos que sí se usan. El candidato obvio eran los seis identificadores —volumen, número,
páginas, ISBN, ISSN, editorial— que están en blanco en la mayoría de los tipos, pero
plegarlos los habría dejado cerrados justo al crear un artículo de revista, que es cuando
hacen falta. Se revisa en la fase 5: el editor de texto enriquecido cambia el tamaño de
resumen y descripción, y entonces la cifra querrá decir otra cosa.

**El reparto no es el que decía el plan, y se cambió a propósito.** El plan metía autores
y etiquetas en «Material». Los autores son lo segundo que se sabe de una publicación,
después del título, y las etiquetas dicen de qué trata igual que el resumen. Así que los
autores van con **Lo básico** y las etiquetas con **Contenido**; «Material» son enlaces,
archivos y citas, que es lo que la palabra significa. Mismo número de bloques, cada
título dice de verdad lo que hay debajo.

En Evento pasó algo parecido y más claro: `organizer` —texto libre— y la lista de
instituciones organizadoras eran lo mismo dicho de dos maneras, en tarjetas separadas por
900px de scroll. Ahora están juntas.

**El bloque plegado se tragaba los errores.** Con un valor inválido dentro y el bloque
cerrado, pulsar «Save» no hacía nada y no explicaba nada. No lo vi mirando: lo cazó una
prueba escrita para intentarlo con el bloque cerrado a propósito. `CollapsibleCard` acepta
`forceOpen` y se abre en cuanto aparece un error dentro.

**Y once cadenas en castellano que la fase 1 dejó pasar** —«Admite Markdown.»,
«Opcional.», «merece ficha propia», «https://doi.org/ delante», «Continuar», un mensaje de
error de inicio de sesión entero—. La prueba de idioma miraba las líneas de una en una, y
prettier parte los párrafos largos: cada trozo por separado parecía inglés. Ahora junta el
texto entre etiquetas aunque ocupe varias líneas, y la lista de palabras creció. Se validó
rompiendo el código a posta.

### Fase 5 — El texto enriquecido

- [x] Editor sobre los 11 campos Markdown: negrita, cursiva, títulos, listas, enlace y
      cita. Nada más.
- [x] Sigue guardando Markdown. **Nunca lo reescribe**: comprobado con vídeo y todo.
- [x] El botón de insertar imagen del blog se integra en la barra del editor.
- [x] Decidida la librería con el titular antes de instalar nada. **No se instaló
      ninguna.**

Medido antes de elegir, comprimido y con React fuera: Tiptap con su puente a Markdown
186 kB, Lexical 125 kB, Milkdown 887 kB, `marked` a secas 12 kB.

Y al abrirlo apareció lo que ninguna de esas cifras decía: **un editor visual habría roto
el vídeo del blog**. El reproductor aparece porque una dirección de YouTube va sola en su
línea; cualquier editor que convierta el Markdown a su formato y de vuelta la habría
devuelto como `[https://…](https://…)`, y el vídeo habría dejado de incrustarse. Lo mismo
con las imágenes, que tienen que ser exactamente `![alt](/api/public/media/<id>)`. Con
WYSIWYG hacía falta un nodo propio para cada cosa y comprobar el viaje de ida y vuelta en
los once campos.

Elegido: **barra de botones sobre el campo de siempre, más vista previa**. Los botones
escriben la sintaxis alrededor de lo seleccionado, y el texto guardado no se vuelve a
escribir jamás. Cero riesgo sobre lo que ya hay.

**La vista previa la calcula el servidor**, en `POST /api/admin/markdown/preview`. Es una
desviación de lo que se habló —se habló de `marked` en el navegador, 12 kB— y sale mejor
por las dos puntas: son 0 kB de dependencia nueva, y sobre todo es **el mismo HTML** que
sale publicado. Convertirlo en el navegador obligaba a repetir allí el conversor, la lista
de servidores de vídeo y el saneador; en cuanto una de las dos copias cambiara, la vista
previa enseñaría algo que la página no enseña. Una dirección de vídeo suelta se habría
visto como texto en la previa y como reproductor en la web.

Los botones son de doble sentido: el mismo pone y quita. Los de línea —título, listas,
cita— actúan sobre la línea entera y no sobre donde cayó el ratón.

**Dos fallos que cazaron las pruebas, no yo:**

- La llamada iba a `/admin/markdown/preview` en lugar de `/api/admin/…`, así que pegaba
  contra la propia aplicación y devolvía 405. La prueba unitaria no podía verlo —tiene el
  cliente sustituido—; lo vio el barrido en navegador.
- Y al romper el código a posta para validar las pruebas, resultó que cuatro de ellas
  seleccionaban justo desde el principio de una línea, donde «prefijo a la línea entera» y
  «prefijo donde cayó el ratón» dan lo mismo. Pasaban con el código roto. Ahora
  seleccionan a media palabra.

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
