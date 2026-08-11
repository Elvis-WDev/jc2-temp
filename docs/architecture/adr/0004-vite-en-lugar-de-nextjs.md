# ADR 0004: Vite + React en lugar de Next.js para el frontend

## Status

Accepted

## Context

`docs/architecture/stack.md:33` fija Next.js con TypeScript como framework de frontend.

El frontend disponible es `shadcn-admin`, una plantilla de panel construida sobre Vite
y React 19 con TanStack Router, TanStack Query, TanStack Table y shadcn/ui. Trae ya
resueltos el layout autenticado, la tabla de datos, los diálogos, el tema claro/oscuro,
la paleta de comandos y las páginas de error.

Se decidió además que el panel administrativo y las páginas públicas (Home, Research,
Teaching) vivan en **una sola aplicación**, no en dos.

Las dos partes tienen necesidades distintas:

- El **panel** está detrás de login. No hay SEO que ganar y el tiempo de primera
  pintura es irrelevante: quien entra va a trabajar. El SSR de Next.js no aporta nada.
- Las **páginas públicas** sí lo necesitan. `ERS.md` §39 pide `<title>`, meta
  description, canonical, OpenGraph, Twitter cards y JSON-LD Person, y añade que
  Research debería renderizar los metadatos de los trabajos en HTML del servidor "si el
  stack frontend lo permite". Una SPA entrega un HTML vacío que se pinta con JavaScript.

## Decision

Se usa Vite + React para toda la aplicación, panel y páginas públicas.

Para el panel no hay contrapartida: se aprovecha una plantilla madura y no se pierde
nada.

Para las páginas públicas se acepta que, tal cual, no habrá HTML renderizado en el
servidor. Cuando se implementen se elegirá entre estas salidas, que no obligan a
cambiar de framework:

- prerenderizar las tres rutas públicas en el build, que son fijas y pocas;
- usar el prerender del proveedor de despliegue (ya existe `netlify.toml` en el
  repositorio);
- añadir una capa ligera de SSR solo para las páginas públicas si lo anterior se queda
  corto.

La decisión concreta se toma al construir esas páginas, con los requisitos delante.

## Consequences

- Positiva: el panel arranca con la mitad del trabajo hecho y sin coste técnico.
- Positiva: una sola aplicación, un despliegue, un conjunto de componentes y un tema.
  El panel y el sitio público comparten la biblioteca de interfaz sin duplicarla.
- Negativa: se desvía de `stack.md:33`, que queda desactualizado en este punto; este
  ADR es la fuente de verdad.
- Negativa: el cumplimiento de `ERS.md` §39 queda aplazado y condicionado a una
  decisión posterior. Si esa decisión se olvida, el sitio publicará papers que los
  buscadores académicos no indexarán bien. Debe quedar como criterio de aceptación de
  la fase de páginas públicas.
- Negativa: Better Auth ofrece integraciones pensadas para Next.js que no se usan; la
  sesión se maneja con axios y `withCredentials`, que es igual de válido pero hay que
  escribirlo.
- Seguimiento: al implementar las páginas públicas, decidir y documentar la estrategia
  de prerenderizado. **Resuelto en ADR-0005** (11 ago 2026): metadatos en el cliente,
  sitemap en el servidor, y renderizado en servidor pendiente de decidir con el sitio en
  produccion.
