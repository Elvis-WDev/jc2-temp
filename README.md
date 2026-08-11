# ExpressJS Agent Context

Context engineering kit para construir aplicaciones fullstack con Express.js,
Next.js y agentes de IA sin perder consistencia arquitectonica, calidad ni criterio de
interfaz.

Este repositorio no es un starter de codigo. Contiene un sistema de conocimiento en
Markdown para que Codex, Claude, GitHub Copilot y otros agentes puedan entender como
trabajar en un proyecto antes de modificarlo.

## Por que existe

Un agente puede generar codigo rapidamente, pero sin contexto persistente suele:

- inventar patrones distintos en cada modulo;
- mezclar reglas de negocio con infraestructura;
- duplicar componentes y documentacion;
- exponer detalles tecnicos en la interfaz;
- omitir estados, permisos, pruebas o migraciones;
- depender de conversaciones que el siguiente agente no conoce.

Este repositorio convierte esas decisiones en instrucciones versionadas, navegables y
verificables dentro del propio proyecto.

## Que obtienes

| Area          | Contexto incluido                                              |
| ------------- | -------------------------------------------------------------- |
| Agentes       | Instrucciones para Codex, Claude y GitHub Copilot              |
| Arquitectura  | Express.js, Next.js, limites por capas e integraciones         |
| Datos         | PostgreSQL, Prisma y migraciones versionadas                   |
| Autenticacion | Better Auth y reglas para no reinventar sesiones               |
| Frontend      | shadcn/ui, Tailwind, formularios, tablas y estados compartidos |
| UX operativa  | Jerarquia visual, baja fatiga, responsive y accesibilidad      |
| Calidad       | Definition of Done, testing, code review y observabilidad      |
| Seguridad     | Principios, boundaries y threat model                          |
| Ejecucion     | Planes activos, decisiones y skills reutilizables              |

## Stack de referencia

- Node.js y TypeScript.
- Express.js para API REST.
- Next.js y React para frontend.
- Better Auth para identidad y sesiones.
- PostgreSQL como base de datos principal.
- Prisma para ORM y migraciones.
- Tailwind CSS y shadcn/ui para interfaz.
- React Hook Form y Zod para formularios.
- Axios para integraciones HTTP server-side.
- pnpm mediante Corepack.
- Docker para desarrollo y despliegue.

El stack es una decision base, no una restriccion irreversible. Si un proyecto necesita
desviarse, debe registrar la razon y sus consecuencias en un ADR.

## Inicio rapido

Para iniciar un proyecto nuevo desde esta base documental:

```bash
git clone --depth 1 https://github.com/Elvis-WDev/ExpressJS-agent-context.git context-template
rsync -av --exclude='.git' context-template/ ruta/de/tu-proyecto/
rm -rf context-template
```

Luego completa, como minimo:

1. Reemplaza `{{PROJECT_NAME}}` en `AGENTS.md`.
2. Define proposito, usuarios y workflows en [docs/product/overview.md](docs/product/overview.md).
3. Modela entidades y reglas en [docs/product/domain-model.md](docs/product/domain-model.md).
4. Revisa el stack en [docs/architecture/stack.md](docs/architecture/stack.md).
5. Ajusta los comandos reales de verificacion en `AGENTS.md`.
6. Crea las primeras especificaciones bajo `docs/product/features/`.
7. Registra trabajos no triviales en `docs/plans/active/`.

Si el proyecto ya existe, copia la estructura documental y adapta cada archivo a la
arquitectura real antes de pedir cambios al agente.

## Como funciona el contexto

```text
AGENTS.md
  -> indica que leer y como trabajar
ARCHITECTURE.md
  -> muestra componentes, limites y dependencias
docs/product/
  -> explica que debe hacer el producto
docs/architecture/
  -> explica como debe construirse
docs/plans/
  -> conserva la estrategia de trabajos complejos
.agents/skills/
  -> ejecuta procedimientos repetibles
docs/quality/ + docs/security/
  -> define cuando un cambio es aceptable
```

La idea no es cargar todo el repositorio en cada prompt. El agente empieza con un mapa
pequeno y abre solamente la fuente de verdad relevante para la tarea.

## Flujo recomendado con agentes

1. Leer `AGENTS.md` y las instrucciones mas cercanas al codigo afectado.
2. Abrir la especificacion y arquitectura relacionadas con la tarea.
3. Crear o actualizar un plan cuando el trabajo sea no trivial.
4. Implementar el cambio coherente mas pequeno.
5. Ejecutar formato, lint, tipos, pruebas y build.
6. Actualizar documentacion y referencias derivadas.
7. Registrar decisiones costosas o duraderas mediante ADR.
8. No declarar terminado mientras implementacion, pruebas y documentacion difieran.

Ejemplo de solicitud inicial:

```text
Lee AGENTS.md y la documentacion relevante para esta tarea.
Antes de editar, identifica la especificacion, los limites arquitectonicos y la
Definition of Done. Implementa, verifica y actualiza la documentacion afectada.
```

## Skills incluidos

- `implement-feature`: implementar comportamiento desde especificacion hasta verificacion.
- `create-migration`: cambiar modelos y datos mediante migraciones seguras.
- `review-code`: revisar bugs, seguridad, regresiones, arquitectura y pruebas.
- `update-documentation`: mantener fuentes de verdad y referencias sincronizadas.
- `implement-operational-frontend`: construir interfaces operativas consistentes y sin sobrecarga visual.

Los skills viven en `.agents/skills/` y se cargan solo cuando la tarea los necesita.

## Criterio frontend

El contexto incluye reglas concretas para evitar que paneles administrativos y
aplicaciones operativas terminen como una acumulacion de cards, formularios, filtros y
mensajes.

- [Arquitectura frontend](docs/architecture/frontend.md)
- [Sistema de componentes](docs/architecture/component-system.md)
- [Diseno de interfaces operativas](docs/architecture/interface-design.md)
- [Data tables](docs/architecture/data-tables.md)
- [Formularios y workflows](docs/architecture/forms-and-workflows.md)
- [Feedback y estados](docs/architecture/feedback-and-states.md)
- [Navegacion y responsive](docs/architecture/navigation-responsive.md)
- [Checklist frontend](docs/quality/frontend-checklist.md)

Principios esenciales:

- usar lenguaje de negocio y ocultar IDs o detalles internos;
- mantener tablas, filtros, acciones y paginacion uniformes;
- usar modales para CRUD breve y paginas completas para workflows complejos;
- comunicar acciones con feedback semantico sin llenar la pagina de banners;
- limitar la navegacion visible a dos niveles;
- reutilizar componentes antes de crear variantes por modulo;
- verificar desktop, mobile, teclado, light mode y dark mode;
- eliminar contenido redundante que no ayude a decidir o actuar.

## Mapa del repositorio

```text
.
├── AGENTS.md                       # Reglas permanentes para agentes
├── ARCHITECTURE.md                 # Mapa tecnico de alto nivel
├── CLAUDE.md                       # Entrada para Claude
├── .agents/skills/                 # Procedimientos reutilizables
├── .github/                        # Instrucciones para Copilot
├── .codex/                         # Configuracion, no conocimiento del producto
└── docs/
    ├── product/                    # Producto, dominio y features
    ├── architecture/               # Stack, boundaries y patrones
    ├── plans/                      # Trabajo activo, completado y deuda
    ├── quality/                    # Testing, review y Definition of Done
    ├── security/                   # Principios y amenazas
    └── generated/                  # Referencias derivadas
```

## Fuentes de verdad

- [Guia para agentes](AGENTS.md)
- [Mapa de arquitectura](ARCHITECTURE.md)
- [Indice de documentacion](docs/README.md)
- [Indice de arquitectura](docs/architecture/index.md)
- [Definition of Done](docs/quality/definition-of-done.md)
- [Principios de seguridad](docs/security/principles.md)

## Que no incluye

- Codigo de una aplicacion concreta.
- Requerimientos de un dominio o cliente.
- Dependencias instaladas o build output.
- Secretos, credenciales o variables de entorno reales.
- Una arquitectura inmutable que deba aplicarse sin evaluar contexto.

El repositorio contiene solamente contexto Markdown reutilizable. Cada aplicacion debe
completar sus especificaciones de producto y mantenerlas junto al codigo.

## Reglas que no deben romperse

- `AGENTS.md` es un mapa corto, no una enciclopedia.
- `docs/` conserva el conocimiento durable del proyecto.
- Las instrucciones cercanas al codigo tienen prioridad sobre las globales.
- Los secretos permanecen fuera del repositorio y del frontend.
- Los cambios de base de datos usan migraciones.
- Las reglas criticas se convierten en tests, linters o automatizacion.
- Un cambio no esta terminado sin implementacion, verificacion y documentacion coherentes.
- Los errores repetidos del agente deben transformarse en contexto o controles ejecutables.

---

Construido para que el siguiente agente no tenga que adivinar las decisiones que el
equipo ya tomo.
