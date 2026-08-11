# Plan: cerrar los huecos del panel

Cierra lo que encontró la auditoría del 11 ago 2026 (`admin-frontend.md`, sección
"Auditoría de criterios por módulo"): ocho recursos sin pantalla, dos módulos con el
CRUD a medias y cuatro criterios aplicados solo en algunos sitios.

Ocho fases. Cada una deja el panel en un estado usable y verificado; ninguna depende de
que la siguiente exista.

## Dos decisiones tomadas

**Cuándo modal y cuándo página.** La regla es una sola línea: **modal para una fila de
una tabla, página para algo que contiene sus propias listas.**

| Modal | Página completa |
| --- | --- |
| Instituciones, Departamentos, Autores, Etiquetas, Tipos de trabajo, Archivos, Afiliaciones, Enlaces, Ediciones de curso, Materiales | Trabajos, Cursos, Perfil, Configuración |

Trabajos y Cursos llevan colecciones dentro (autoría, etiquetas, enlaces, archivos;
ediciones y sus materiales). Meterlas en un modal obliga a hacer scroll dentro de una
ventana flotante y a abrir un segundo modal encima del primero para cada hijo. Perfil y
Configuración no son filas de ninguna tabla: son un formulario largo que se edita en su
sitio. Si prefieres Trabajos y Cursos en modal, se cambia; es la fase 6 la que más
trabajo tendría que rehacer.

**Ocultar deja de ser un callejón sin salida.** Hoy ocultar algo es irreversible desde
el panel, y por eso pedía la confirmación más dura. La fase 1 lo invierte: se añade
"Activar", con lo que ocultar pasa a ser reversible, y entonces basta con una
confirmación que diga qué va a pasar. La confirmación de dos pasos con el nombre escrito
se reserva para borrar, que sí es definitivo. Si aun así quieres los dos pasos también
para ocultar, es un parámetro del mismo componente.

## Fase 1 — Poder deshacer, y avisar antes

Transversal. Es la más pequeña y la que más riesgo quita.

- Acción **Activar** en Instituciones, Tipos de trabajo y Etiquetas. La API ya lo admite
  (`PATCH` con `isActive: true`, comprobado: 200 en los tres).
- Confirmación antes de **ocultar** una institución o un tipo de trabajo y antes de
  **archivar** un trabajo. Hoy se ejecutan al primer clic.
- El botón deja de deshabilitarse cuando algo ya está oculto: pasa a ser el botón
  contrario.
- **Perfil** pasa a `useToastMutation`, como el resto. Hoy usa `useMutation` en crudo y
  al fallar solo pinta un texto dentro del formulario.

Toca: `institutions/`, `work-types/`, `tags/`, `works/`, `profile/`.

## Fase 2 — Los filtros que cada módulo necesita

| Módulo | Filtros a añadir | Dónde |
| --- | --- | --- |
| Instituciones | estado | ya en la API |
| Etiquetas | estado, categoría | ya en la API |
| Tipos de trabajo | estado | ya en la API |
| Auditoría | tipo de entidad, usuario, rango de fechas | ya en la API |
| Archivos | tipo de archivo, visibilidad | **hay que añadirlo a la API** |

Los archivos no guardan para qué se subieron: el propósito solo valida la subida, no se
persiste. Así que el filtro por tipo se resuelve agrupando por `mimeType` (imagen,
documento, hoja de cálculo, otro) en `mediaListQuerySchema` y en el `where` del
repositorio. **Sin migración.** La alternativa —una columna `purpose` nueva— no aporta
nada que el usuario note y sí obliga a rellenar hacia atrás lo ya subido.

Autores queda como está: su API solo acepta búsqueda por texto y no le falta nada.

**Hecha el 11 ago 2026.** Al conectarlos aparecieron tres fallos que la auditoría no
había visto, todos verificados contra la base de datos:

- **El filtro de facetas nunca llegaba a la URL.** Guardaba siempre un array y los
  filtros declarados como texto descartan lo que no sea texto, así que el filtro de
  estado de Trabajos —el único que existía— marcaba la opción en pantalla y no filtraba
  nada. Ahora es de una sola opción por defecto (`multiple` para varias).
- **Las cajas de búsqueda de Instituciones y Archivos no hacían nada**: el término
  llegaba a la URL y nunca a la petición. En Instituciones el repositorio además
  ignoraba `q`.
- **`active=false` significaba "todas", no "solo las ocultas"**, así que no había forma
  de encontrar lo que se había ocultado en la fase 1. Ahora son tres estados.

Añadido de camino: `GET /tags/categories` (la categoría es texto libre, el filtro no
puede tener una lista fija), `action` en el filtro de auditoría, y `DateRangeFilter` con
un hueco `extraFilters` en la barra de herramientas para filtros que no son listas.

El filtro por usuario de la auditoría se deja fuera a propósito: solo hay un
administrador, y un desplegable de una sola persona es ruido.

## Fase 3 — Editar un archivo ya subido

Diálogo de edición en Archivos, que usa `updateMediaMetadata` (escrito desde hace
semanas y nunca llamado): texto alternativo, pie, crédito y visibilidad.

**El nombre del archivo no se puede cambiar**: `UpdateMediaMetadataInput` no lo incluye y
`originalFilename` forma parte de cómo se sirve. Si quieres renombrar, es un cambio de
backend aparte; dilo y lo añado a esta fase.

**Hecha el 11 ago 2026.** El diálogo se adapta al archivo: la descripción para lectores
de pantalla solo aparece en imágenes, porque describir un ZIP a quien no puede verlo no
significa nada. Verificado contra la base de datos que un PATCH solo toca los campos que
viaja y que el tipo del archivo no se puede cambiar por esta vía.

Sigue sin poderse **renombrar**. Ahora pesa más que cuando se escribió este plan: la
fase 2 hizo que se pueda buscar por nombre, así que un archivo llamado
`Captura 2026-03-15 a las 14.23.11.png` es difícil de encontrar. Cambiar
`original_filename` no toca el disco —la ruta real es `storage_key`, otra columna— pero
hay que decidir qué pasa con la extensión, que debe seguir correspondiendo al tipo real
detectado al subir. Pendiente de decisión.

## Fase 4 — Departamentos

Módulo propio, con su entrada en el menú al lado de Instituciones. El cliente de API ya
está escrito y sin usar (`createDepartment`, `updateDepartment`, `deleteDepartment`).

- Tabla con filtro por institución y por estado.
- Modal de alta y edición.
- Borrado con la confirmación de dos pasos; si tiene afiliaciones o ediciones de curso
  colgando, la API responde 409 y se ofrece ocultarlo.

**Hecha el 11 ago 2026.** Al montarlo apareció un fallo de integridad que no tenía que
ver con la pantalla:

**Mover un departamento de institución reescribía en silencio las afiliaciones.** La
clave foránea compuesta que respalda RN-006 es `ON UPDATE CASCADE`, así que cambiar
`departments.institution_id` arrastraba consigo `affiliations.institution_id`.
Comprobado contra la base de datos: una persona afiliada a "Casa A / Depto X" pasaba a
estarlo a "Casa B / Depto X" sin que nadie lo pidiera. Corregir una errata en el
formulario habría reescrito dónde ha trabajado alguien.

Se corta en el dominio (`assertDepartmentCanChangeInstitution`, 409
`DEPARTMENT_HAS_DEPENDENTS`) y no solo en el formulario, porque el panel no es el único
cliente. El selector de institución además queda fijo al editar, con el motivo escrito.

`DepartmentRecord` gana `institutionName`: un listado de todos los departamentos sin el
nombre de su institución solo tendría un identificador que no dice nada, y resolverlo en
el cliente obligaría a traerse antes todas las instituciones.

Los grupos del menú **Research** y **Teaching** pasan a **Investigación** y **Docencia**:
eran los dos únicos rótulos en inglés de un panel en castellano.

## Fase 5 — Perfil completo: Afiliaciones y Enlaces

Dos entradas del menú que hoy llevan a un 404.

- **Afiliaciones**: institución, departamento, cargo, tipo, fechas, principal, actual.
  El departamento se limita a los de la institución elegida — es la regla que devolvía
  500 al no poner departamento y que quedó arreglada esta semana.
- **Enlaces**: tipo, etiqueta, URL, icono, visible, orden.

**Hecha el 11 ago 2026.** Apareció un fallo sistémico que no era de estas dos pantallas:

**Ninguna fecha se podía guardar en todo el sistema.** El esquema dejaba pasar
`"2024-05-01"` tal cual y Prisma, que espera un `Date` para una columna `date`,
respondía 500. Afectaba a los cinco campos de fecha que existen: la de publicación de un
trabajo, las de una edición de curso y las de una afiliación. Ninguno se había ejercitado
nunca, ni desde el panel ni en las verificaciones anteriores. Corregido con
`calendarDateSchema`, que convierte en el borde —donde el formato de transporte se vuelve
tipo de dominio— y construye desde `AAAA-MM-DD`, que JavaScript lee en UTC, así que el
día guardado es el que se escribió sea cual sea la zona del servidor.

Las rutas de administración devolvían además el instante ISO completo mientras la entrada
esperaba el día, así que cargar una fecha y volver a guardarla sin tocarla habría sido
rechazado. Las afiliaciones ya tienen presentador propio (`toAffiliationDto`) que emite
el día; **works y course-offerings siguen devolviendo el instante en las rutas de
administración**, por lo que `calendarDateSchema` acepta las dos formas. Normalizar sus
salidas queda para la fase 6.

`AffiliationRecord` gana `institutionName` y `departmentName`, por lo mismo que
`DepartmentRecord` en la fase 4.

## Fase 6 — Cursos

La entrada del menú lleva hoy a un 404. Es la fase más grande.

**No hay `GET /course-offerings` ni `GET /course-materials`.** Las ediciones vienen
anidadas en `GET /courses/:id`. Son registros hijos de un curso, no listados sueltos, así
que van dentro de la pantalla del curso — el mismo patrón que ya usa Trabajos con su
autoría y sus archivos. No hace falta ningún endpoint nuevo.

- **Lista de cursos**: tabla con filtro por estado y búsqueda; publicar, archivar,
  destacar y borrar desde la fila.
- **Página del curso**: datos, etiquetas, portada y la sección de **ediciones**.
- **Ediciones**: institución, departamento coherente con ella, periodo, año, fechas, rol,
  contenido. Publicar y archivar. Una edición no se puede publicar si el curso está en
  borrador: la API responde 422 y el botón lo explica en lugar de dejar que falle.
- **Materiales** dentro de cada edición: archivo **o** enlace, nunca los dos ni ninguno
  (la API lo rechaza con 422; el formulario lo impide antes).

**Hecha el 11 ago 2026.** Aparecieron dos fallos que no eran de esta pantalla y que
afectaban a todo el sistema:

**Toda la web pública de detalle estaba rota.** `findPublished(idOrSlug)` comparaba el
slug contra `id`, que es una columna `uuid`: PostgreSQL rechaza la consulta entera, así
que abrir un trabajo o un curso por su dirección legible devolvía 500 mientras que
abrirlo por su identificador devolvía 200. Como la web solo usa direcciones legibles,
ninguna ficha se abría. Corregido en `shared/uuid.ts` (`matchIdOrSlug`), que solo
pregunta por el identificador cuando lo que llega puede serlo.

**Un PATCH sobrescribía en silencio los campos que no enviaba.** `.partial()` no quita
los valores de `.default()`, así que editar cualquier cosa reseteaba lo que no se
mencionara. Cinco esquemas afectados: materiales (`isPublic`, `mediaId`, `externalUrl`,
`description`, `sortOrder`), afiliaciones (`isPrimary`, `isCurrent`, `sortOrder`),
enlaces (`isPublic`, `sortOrder`), y el `slug` de trabajos y cursos. Se descubrió porque
cambiar el origen de un material lo hacía desaparecer de la web sin que nadie lo hubiera
ocultado. Corregido con `patchSchemaOf`, que deriva el esquema del PATCH quitando los
valores por defecto; el del alta no cambia, que es donde sí hacen falta.

Confirmado que RN-010 sigue como debe: en borrador el identificador sigue al título; una
vez publicado no cambia, así que los enlaces compartidos no se rompen.

Las rutas de administración de cursos ya devuelven las fechas como día
(`toAdminCourseDto`, `toAdminOfferingDto`), que era lo que quedaba pendiente de la fase 5.

## Fase 7 — Contenido de páginas y Configuración

Las dos últimas entradas rotas del menú.

- **Contenido de páginas**: tabla de tres filas —Home, Research, Teaching— y modal de
  edición con antetítulo, título, entradilla, texto secundario, imagen de cabecera con su
  texto alternativo, y si está publicada.
- **Configuración**: página única con nombre del sitio, idioma, zona horaria, URL
  pública, email de contacto, título y descripción por defecto, imagen para redes,
  pie de página y los cuatro interruptores de qué se muestra en la web.

**Hecha el 11 ago 2026.** Apareció un fallo al probar el interruptor antes de exponerlo:

**"Visible en la web" no hacía nada en las páginas.** La ruta pública servía el contenido
sin mirar `is_published`, así que una página oculta se abría igual a cualquiera que
supiera su dirección. Corregido con `getPublishedPage`, separado de `getPage` porque el
panel sí tiene que poder leer una página no publicada — es lo que edita antes de
publicarla.

**Limitación conocida:** la portada compuesta (`/api/public/home`) sigue incluyendo el
texto de la página `home` aunque esté oculta. Devolver 404 ahí tumbaría la portada
entera, y decidir qué debe pasar es cosa de las páginas públicas, que este plan no toca.
Queda para entonces.

Componente nuevo: `ImagePicker`, para elegir una imagen ya subida o subir una nueva. Lo
usan la cabecera de las páginas y la imagen para redes; servirá también para la portada
de un curso y la foto del perfil.

## Fase 8 — Verificación

- Script contra la base de datos real que recorra el CRUD de todo lo nuevo, como el que
  encontró el 500 de las afiliaciones.
- Repaso de los diez criterios módulo por módulo, con la evidencia al lado de cada uno.
- `pnpm verify` en `api/` y en `web/`.
- Ningún enlace del menú lateral lleva a un 404.

## Lo que este plan no toca

Las páginas públicas (Home, Research, Teaching) y la estrategia de prerenderizado para
el SEO de la ERS §39. Van después, sobre el mismo proyecto, según lo acordado.

---

## Resultado de la fase 8 (11 ago 2026)

`pnpm verify` en verde en los dos proyectos: **250 pruebas** en el backend, **116** en el
panel. **54 comprobaciones** contra la base de datos real en una sola pasada, sin fallos.
Ningún enlace del menú lleva a un 404. Ningún recurso de la API se queda sin pantalla.

### Los diez criterios, con la evidencia

| Criterio | Estado |
| --- | --- |
| Toast en toda acción | `useToastMutation` en los 13 módulos con mutaciones. Los tres que no lo usan —auditoría, panel de inicio, errores— son de solo lectura. |
| CRUD en cada módulo | Ninguna función de API declarada sin usar, salvo `getTag` (código muerto anterior). Alta, edición, ocultar/mostrar y baja probados contra la base de datos en los 12 módulos. |
| Sin pestañas | Cero `<Tabs>` en toda la interfaz. Los submódulos se separan en el menú lateral, reordenable arrastrando. |
| Una sola tabla reutilizable | `AppDataTable` en los 12 listados. Perfil y Configuración no la usan porque no son listas. |
| Filtros por módulo | Todos tienen búsqueda salvo Auditoría, que en su lugar filtra por entidad, acción y rango de fechas. Autores solo admite búsqueda porque su API no ofrece más. |
| Modales para alta y edición | Diez módulos en modal. Cuatro en página: Trabajos y Cursos porque llevan colecciones dentro; Perfil y Configuración porque no son filas de ninguna tabla. |
| Doble confirmación | Escribir el nombre exacto para borrar. Confirmación de un paso para ocultar y archivar, que se deshacen desde el propio panel. |
| Color en las tablas | `StatusBadge` en los 11 listados con estado, siempre con punto además del color. |
| Lógica de negocio conectada | Las reglas que la API rechaza se impiden antes en la interfaz: publicar una edición con el curso en borrador, elegir un departamento de otra institución, poner archivo y enlace en el mismo material. |
| Textos entendibles | Sin jerga en pantalla: las referencias a la ERS viven solo en comentarios de código. Panel entero en castellano, incluidos los textos para lector de pantalla. |

### Lo que apareció al verificar

- **Slug repetido daba 500** en instituciones y departamentos, con el mensaje "error
  inesperado, contacte con soporte" para algo que el usuario puede resolver solo. Ahora
  409 diciendo qué campo choca, y marcado en el formulario. La red está en el manejador
  de errores, así que cubre cualquier tabla, no solo las dos que fallaban.
- **El aviso de visibilidad de un archivo mentía.** Decía "cualquiera podrá descargarlo"
  cuando marcar el archivo no basta: además tiene que colgar de algo publicado (RN-001).
  Verificado el recorrido completo: marcado pero sin usar → 404; usado en un curso en
  borrador → 404; con el curso publicado → 200; quitándole la marca → 404.
- **La paleta de comandos y los textos accesibles estaban en inglés** (`Toggle Sidebar`,
  `Go to next page`, `Clear selection`, `Theme`, `Light`…). Traducidos: los lee quien
  navega con lector de pantalla, y eran el último resto de la plantilla.
- El menú decía "Dashboard" y la pantalla se llamaba "Panel".

### Limitaciones conocidas

- La portada compuesta (`/api/public/home`) incluye el texto de la página `home` aunque
  esté oculta. Decidir qué debe pasar es cosa de las páginas públicas.
- `pnpm verify` del panel no incluye `format:check`: Prettier está configurado a 80
  columnas y el proyecto entero está escrito a ~90–100, así que fallan 64 archivos,
  casi todos de la plantilla. Es anterior a este trabajo y arreglarlo es un diff enorme
  sin relación con nada de esto. El backend sí lo comprueba y pasa.
- El nombre de un archivo subido sigue sin poderse cambiar.
