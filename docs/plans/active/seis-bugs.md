# Seis fallos encontrados y cómo se arreglan

Salieron de una cacería con la aplicación en marcha: sonda por sonda contra el Docker
local, no leyendo código a ver qué pintaba mal. Cada uno está reproducido; los tres
últimos son míos, de las fases 4 y 5 de `panel-legible.md`.

El orden de las fases va por lo que cuesta perder, no por lo que cuesta arreglar.

## Lo que se sabe antes de empezar

- **Ningún dato está perdido todavía.** Los cinco eventos siguen con su
  `published_at`; ningún trabajo archivado se ha quedado sin fecha. El fallo 1 es una
  bomba sin estallar, no un destrozo que haya que reparar.
- **El huso horario del sitio ya existe.** `site_settings.timezone` vale
  `Australia/Sydney`, se edita en el panel, se valida y **no se usa en ninguna parte**.
  El comentario de `web/src/lib/locale.ts` ya da por hecho que existe —«porque la zona
  horaria configurada es `Australia/Sydney`»— y aun así solo se aplica el idioma. El
  fallo 2 no pide decidir nada nuevo: pide terminar lo que ya estaba decidido.
- **Lo que hay que evitar al arreglar el resumen:** convertir el Markdown a texto plano
  con `marked` + saneador deja el texto limpio, pero `&` sigue saliendo como `&amp;` y
  `>` como `&gt;`. Ya pasa hoy —lo comprobé— así que no es una regresión nueva, pero si
  se toca el extracto hay que llevárselo por delante de paso.
- **El deshacer tiene arreglo y está probado:** `document.execCommand('insertText')`
  conserva la pila nativa del `textarea`. Verificado en el Chromium del proyecto:
  escribir, aplicar negrita con el «botón», Ctrl+Z y volver al texto de partida.

---

## Fase 1 — Archivar un evento no puede borrarle la fecha ✅

**El fallo.** `EventUseCases.archive` (`api/.../events/EventUseCases.ts:141`) tenía un
comentario que decía *«Se conserva `published_at`»* y debajo pasaba `null`. Las entradas
lo hacían bien: `PostUseCases.ts:141` pasa `actual.publishedAt`. Probado en marcha: un
evento con `2026-08-19T14:57:40.044Z` volvía con `null`. Volver a publicarlo escribe la
fecha de hoy, así que **la original no se recuperaba**.

- [x] `archive` pasa la fecha que ya tenía, como hace `PostUseCases`.
- [x] Prueba de caso de uso, validada rompiéndola a posta.
- [x] Constancia en works y courses de que ellos ya lo hacían bien.

**Hecha.** Un argumento: `null` pasa a ser `actual.publishedAt`. El comentario dice ahora
lo que hace el código, y además por qué importaba.

**Cuatro pruebas nuevas para los eventos**, no una: publicar sella la fecha del reloj
inyectado; archivar la conserva; archivar un borrador la deja vacía en lugar de inventarse
una; y archivar y volver a publicar la sustituye —que es lo correcto, y justamente la
razón por la que perderla al archivar era irreversible—. Con el fallo reintroducido caen
dos de las cuatro; la del borrador sigue pasando, como debe, porque ahí `null` y
`actual.publishedAt` son lo mismo.

**Y una prueba en works y otra en courses que no existían.** Los tres archivan de forma
distinta: los eventos pasan la fecha que ya tenían, works y courses **omiten el campo** y
así el `UPDATE` no toca la columna. Las tres formas son correctas y ninguna estaba
escrita; sin dejarlo por escrito, el siguiente que pase a «unificarlas» tiene bastantes
papeletas de unificarlas hacia el lado malo. Las dos se validaron añadiéndoles
`publishedAt: null` y viéndolas caer.

Comprobado también en marcha, contra el Docker local: los cuatro tipos de contenido
—evento, publicación, entrada y curso— publican, archivan y conservan su fecha; republicar
sella una nueva. La base vuelve a 5 eventos, 16 publicaciones, 5 entradas y 3 cursos.

31 ficheros de prueba, 331 pruebas.

## Fase 2 — El resumen de una publicación se ve con el Markdown crudo ✅

**El fallo.** El campo dice *«Markdown works here»*, la barra de la fase 5 escribe `**`,
y la tarjeta de `/research` enseñaba esto tal cual:

```
We show **strong** revenue results, see [the appendix](https://ejemplo.invalid)
and `theta_i`. ## Second heading - first bullet - second bullet
```

- [x] El extracto pasa por `renderMarkdown` y **después** se le quitan las etiquetas.
- [x] Y se decodifican las cinco entidades XML que dejaba el conversor.
- [x] Pruebas con negrita, enlace, código, título, lista, vídeo, `&` y `<`.
- [x] Corregido el comentario que afirmaba que decodificaba entidades.

**Hecha.** Se convierte primero y se desnuda después. El mismo resumen sale ahora así:

```
We show strong revenue results for A & B when x > y, see the appendix and
theta_i. Second heading first bullet second bullet
```

**Se convierte con `renderMarkdown` y no con `marked` a secas**, y eso importa: una
dirección de vídeo suelta en su línea se vuelve reproductor y desaparece del extracto, en
lugar de quedarse como una URL de sesenta caracteres en medio de la frase. Lo mismo con
una imagen intercalada.

**Las entidades iban de propina y hacían falta.** «Auctions A & B con x > y» salía como
«Auctions A &amp;amp; B con x &amp;gt; y». Se decodifican las cinco en **una sola pasada**:
de una en una, `&amp;amp;lt;` —que es como se escribe un `&amp;lt;` literal— acabaría
convertido en `<`, dos escapes por el precio de uno.

**Once pruebas donde no había ninguna.** Con el código de antes caen siete de las once; las
cuatro que sobreviven son las del recorte, que no dependen de esto. Y una de ellas dice
algo que no era obvio: **el límite se cuenta sobre el texto ya convertido**, así que un
resumen con mucha sintaxis ahora enseña más contenido en el mismo espacio.

**El coste, medido y no supuesto:** 0,48 ms por extracto sobre un resumen de 1.539
caracteres; 9,6 ms para una página de veinte publicaciones. El listado real de dieciséis
son 7,7 ms.

Comprobado en marcha: los dieciséis resúmenes sembrados siguen leyéndose igual, sin una
sola marca a la vista.

32 ficheros de prueba, 342 pruebas.

## Fase 3 — La vista previa se rompe por encima de 20.000 caracteres ✅

**Mío, de la fase 5.** Puse el tope del endpoint en 20.000 con un comentario que decía
que era «el mismo que el del campo más largo que se guarda». Era falso por un factor de
cinco. Un cuerpo de 20.800 caracteres se guardaba sin problema y la previa decía *«The
preview could not be loaded.»*

- [x] El tope sube al del campo más largo de verdad: 100.000.
- [x] Y deja de estar escrito a mano en trece sitios.
- [x] Pruebas con el máximo (pasa) y con uno más (422).
- [x] Corregido el comentario que justificaba el 20.000.

**Hecha, y más ancha de lo que pedía el plan.** El plan hablaba de «dos sitios». Eran
**trece**: doce campos con su número escrito a mano —tres veces 20.000, nueve veces
50.000, una vez 100.000— y el de la previa. Ahora hay tres tamaños con nombre en
`shared/markdown/limites.ts` —`BREVE`, `NORMAL`, `CUERPO`— y los doce campos los usan.

**El tope de la previa se calcula, no se escribe:** `Math.max(...)` de esos tres. Subir un
tamaño lo sube solo, que es lo único que de verdad impide que vuelvan a desfasarse.

**Una prueba mía volvía a no valer para nada.** La que comprobaba que se acepta el campo
más largo construía el texto **con la propia constante del límite**: al bajarla, el texto
encogía con ella y la prueba seguía pasando. Lo vi al rebajar el tope a 20.000 a posta y
ver caer solo una de las dos. Ahora el texto se dimensiona con `CUERPO`, que es el
requisito real, y caen las dos.

**El coste, medido:**

| Tamaño | Convertir |
|---|---|
| 20.000 | 7,1 ms |
| 50.000 | 14,6 ms |
| 100.000 | 27,6 ms |

De punta a punta en el navegador, unos 580–600 ms para los tres, así que lo que se nota es
el viaje, no la conversión.

Comprobado en marcha: los tres tamaños se previsualizan, pasado el tope avisa en vez de
colgarse, y los 100.000 se siguen guardando.

32 ficheros de prueba, 344 pruebas.

## Fase 4 — Ctrl+Z debe deshacer lo que ponen los botones ✅

**Mío, de la fase 5.** Poner negrita y pulsar Ctrl+Z dejaba `hola **mundo**`. Escribir el
valor desde React vacía la pila de deshacer nativa del `textarea`.

- [x] Los botones escriben con `document.execCommand('insertText')`.
- [x] Comprobado que react-hook-form se entera del cambio.
- [x] Salida de emergencia si `execCommand` devuelve `false`.
- [x] Pruebas del deshacer, con un botón de envoltura y con uno de línea.

**Hecha.** Los siete botones dejan de construir el texto entero y pasar por `onChange`:
ahora seleccionan el trozo que van a cambiar y lo escriben con `execCommand('insertText')`,
que es lo único que conserva el deshacer del navegador. El texto que producen es el mismo
—las diez pruebas de la fase 5 pasan sin tocarlas—, lo que cambia es cómo llega.

**Cuatro pruebas nuevas, y cada una guarda algo distinto:**

- Ctrl+Z devuelve el texto de antes. Cae si se vuelve al camino de React.
- Lo mismo con un botón de línea, que toca más texto de una vez.
- **Lo que ve el formulario es lo que hay en el campo.** `execCommand` cambia el DOM por
  su cuenta; si React no se enterase, se guardaría el texto de antes. Se validó
  sustituyendo la escritura por `elemento.value = …`, que es el error clásico: caen cinco.
- **Si `execCommand` devuelve `false`, el botón sigue escribiendo.** Está marcada como
  obsoleta y algún día dejará de estar; ese día se pierde el deshacer, no el botón. Se
  validó quitando la salida de emergencia.

Comprobado en marcha, y con más de lo que pedían las pruebas: Ctrl+Y vuelve a ponerlo, dos
botones seguidos se deshacen **uno a uno** —no de golpe—, el enlace sigue dejando
seleccionada la dirección para escribirla encima, y lo que se guarda es exactamente lo que
puso el botón.

36 ficheros de prueba, 245 pruebas.

## Fase 5 — La fecha de un evento no puede cambiar según quién mire ✅

**El fallo.** La misma página `/events`, el mismo evento publicado:

| Desde | 2026 Festival | 2025 Festival |
|---|---|---|
| Sydney | 15–16 December | 10–11 December |
| Madrid / Lima | **14**–16 December | 10–11 December |
| Honolulu | 14–15 December | **9**–10 December |

- [x] `/api/public/site` entrega el `timezone` que ya estaba guardado.
- [x] Las fechas del sitio se escriben con ese reloj.
- [x] Y el panel también: leer y escribir.
- [x] El campo dice en qué huso se está escribiendo.
- [x] Prueba desde cuatro husos.
- [x] Repasadas las demás fechas.

**Hecha, y con la hora dentro.** Las cuatro ciudades ven ahora `15 December 2026 — 16
December 2026`, y un seminario de una tarde sale como **«5 November 2026, 4:00 pm AEDT»**
desde Sydney, Madrid y Honolulu por igual. La hora se pedía al minuto, se guardaba y no
aparecía en ninguna parte del sitio.

**El nombre del huso detrás de la hora no es decoración:** «4:00 pm» a secas no le sirve
de nada a quien se conecta desde otro continente, que es medio público de un seminario.

**El reloj vive en un módulo, no en una prop.** Se leen fechas en seis sitios del sitio
público y en dos del panel; pasarlo a mano por todos significa que basta olvidarse en uno
para que el fallo siga vivo justo ahí. Se fija una vez al cargar los ajustes —el sitio en
`site-layout`, el panel en `useSiteIdentity`, que ya hacía esa misma consulta— y no vuelve
a cambiar. Por defecto Sydney: con `undefined` se usaría el del navegador, que es el fallo,
y durante el primer instante de cada carga se vería la fecha equivocada.

**La vuelta —de «9:30 en Sydney» al instante— no es directa** y hubo que medirla: se
interpreta el texto como si fuera UTC, se mira qué hora marca ese instante en el huso del
sitio, y la diferencia es el desfase. **Se repite una vez, y esa segunda vuelta es
necesaria de verdad**: quitándola caen las dos pruebas de los saltos de horario, la de
octubre y la de abril.

**Una prueba que ya existía cayó, y tenía razón en caer.** Usaba un evento de las 10:00 a
las 18:00 UTC como ejemplo de «un solo día»; en Sydney eso son las 21:00 del 12 y las
05:00 del 13. Con el reloj del sitio ese evento **sí** ocupa dos días. El fichero entero
cambió de asunto: antes daba por bueno que la fecha se escribiera con el reloj del lector
y solo comprobaba la forma.

**Y otra prueba mía no valía nada:** un bucle sobre cuatro husos que no cambiaba nada, con
un `expect(zona).toBeTruthy()` de relleno. Lo que quería demostrar —que el huso del
navegador no influye— no se puede probar en una prueba unitaria; eso lo comprueba el
barrido, abriendo la misma página desde cuatro ciudades. La quité y lo dejé escrito.

**Lo que se dejó a propósito con el reloj de quien mira:** el registro de auditoría, la
biblioteca de archivos y el «última actualización» del panel. Son de la actividad del
propio operador, no del contenido publicado; ahí la hora local es defendible y es otra
discusión.

Comprobado en marcha: las cuatro ciudades ven lo mismo en `/events` y en `/blog`; el campo
dice «Site time (Australia/Sydney)»; lo tecleado desde Sydney se ve idéntico al abrirlo
desde Lima; y guardarlo desde Lima no lo mueve de sitio.

API 32 ficheros / 344 pruebas. Web 37 / 261.

## Fase 6 — El sitio necesita su propia página de «no existe»

**El fallo.** Una dirección inexistente del sitio público enseña la pantalla índigo del
panel —*«Oops! Page Not Found!»*, botón «Back to Home»— sin cabecera, sin pie y sin la
tipografía del sitio. Y responde **HTTP 200**, así que un buscador la indexa como página
buena.

- [ ] Una pantalla de «no existe» con el marco del sitio: cabecera, pie, y el mismo tono
      que usan «This work is not published.» y «This entry is not published.», que ya
      existen y están bien resueltas.
- [ ] El panel se queda con la suya.
- [ ] Sobre el 200: **es lo normal en una aplicación de una sola página** y no se arregla
      del todo sin renderizar en el servidor. Lo que sí se puede es una etiqueta
      `<meta name="robots" content="noindex">` en esa pantalla, que es lo que de verdad
      evita que la indexen. Se hace eso y se dice por qué no se hace más.

**Riesgo:** ninguno. Es una pantalla.

---

## Cómo se comprueba

- `corepack pnpm verify` en `web/` y las pruebas de `api/` al cerrar cada fase.
- Cada prueba nueva se valida **rompiendo el código a posta** y viéndola caer. En la
  cacería que encontró estos seis, cuatro pruebas mías pasaban con el código roto porque
  seleccionaban justo desde el principio de una línea; no vuelve a pasar.
- Barrido en navegador al cerrar cada fase, y los datos de prueba retirados. La base tiene
  que volver a 5 eventos, 16 publicaciones y 5 entradas.
- La fase 5 se cierra con la sonda de los cuatro husos horarios, que es la que lo destapó.

## Lo que no entra

Un riesgo latente que **no conseguí reproducir**: varias consultas paginadas ordenan por
una clave que puede empatar sin desempate —`events` por `starts_at`, `media_assets` y
`audit_log` por `created_at`—. Creé cuatro eventos a la misma hora exacta y Postgres
mantuvo el orden estable en tres recorridos seguidos. Sin poder enseñarlo roto no se
arregla: queda anotado aquí para cuando alguien lo vea de verdad.
