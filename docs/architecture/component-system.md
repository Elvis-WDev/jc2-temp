# Shared Frontend Component Contracts

## Purpose

The exact component names may follow the codebase, but each application should provide
one shared implementation for recurring operational interactions. Do not create a new
variant in each module.

## Foundation

Prefer shadcn/ui primitives styled through semantic Tailwind tokens. Use Lucide icons
instead of hand-drawn SVGs when a suitable icon exists. Treat third-party component
registries as source code to review and adapt, not as an independent design system.

## Recommended Inventory

| Example contract        | Responsibility                                                             |
| ----------------------- | -------------------------------------------------------------------------- |
| `AppDataTable<T>`       | Search, filters, sorting, columns, rows, selection, states, and pagination |
| `TableToolbar`          | Stable arrangement of search, filters, columns, and table commands         |
| `TablePagination`       | One footer for client and server pagination                                |
| `ColumnVisibilityMenu`  | Business-facing optional column selection                                  |
| `RowActionButton`       | Icon action with permission/state handling and opaque tooltip              |
| `FormDialog`            | Accessible create/edit modal with stable header, body, and footer          |
| `EntityPickerDialog<T>` | Searchable, filterable, paginated relationship selection                   |
| `ConfirmDialog`         | Risk-proportional confirmation for destructive or irreversible actions     |
| `DatePickerField`       | Localized, theme-aware date selection with clear behavior                  |
| `DateTimePickerField`   | Date/time selection with explicit commit when required                     |
| `PasswordField`         | Masked sensitive input with accessible visibility toggle                   |
| `IntegerStepperField`   | Bounded whole-number input with increment/decrement controls               |
| `AsyncButton`           | Stable loading and duplicate-submit prevention                             |
| `SemanticToaster`       | Shared success, error, warning, information, and loading feedback          |
| `EmptyState`            | Distinguish no data, no matches, missing prerequisite, and no permission   |
| `ErrorState`            | Sanitized error with safe retry                                            |
| `PageSkeleton`          | Geometry-preserving initial loading                                        |
| `AppSidebar`            | Permission-aware navigation with no more than two levels                   |
| `AppHeader`             | Page context, mobile menu, theme, and account actions                      |
| `PermissionGate`        | Presentation guard only; backend remains authoritative                     |

Names in this table are illustrative. Reuse an equivalent existing component rather than
renaming a mature codebase only to match this document.

## Contract Rules

Shared components own interaction consistency, not business policy.

- `AppDataTable` owns table mechanics; the module supplies typed columns, filter options, data, and valid actions.
- `FormDialog` owns focus, dismissal, responsive geometry, and footer placement; the form owns fields and business validation.
- `EntityPickerDialog` returns selected business records; it does not know a specific entity type.
- `SemanticToaster` owns visual variants; callers provide human-readable messages.
- `PermissionGate` may hide or disable controls, but cannot replace API authorization.
- Date and number components own parsing/display boundaries and return canonical values.

Do not put API calls, domain-specific permissions, or record lifecycle rules inside a
generic visual primitive.

## Extension Threshold

Add an option to a shared component when:

- at least two modules need the behavior;
- the behavior has the same interaction and accessibility contract;
- the option does not make the base component understand domain entities.

Create a module-specific composition when the workflow has unique business sequencing,
calculations, or lifecycle rules. Compose shared primitives inside it.

## External Component Intake

Before adopting a component from shadcn registries or community catalogs:

1. Inspect the installed source and dependency additions.
2. Remove demo data, branding, global styles, and unrelated variants.
3. Replace hardcoded colors, radius, shadows, fonts, and spacing with project tokens.
4. Replace custom SVGs with the established icon library where appropriate.
5. Align props and states with the shared application contract.
6. Verify keyboard, focus, screen-reader labels, reduced motion, light/dark, and mobile.
7. Consolidate or remove any existing duplicate component.

Do not keep two table systems, two toaster systems, or multiple pagination patterns after
adopting a replacement.

## Stable Geometry

Shared controls must define stable dimensions so icons, loading text, validation, hover,
or dynamic labels do not shift neighboring content. Use consistent medium icon sizes and
at least 44px touch targets for header, navigation, dialog close, and other standalone
touch actions.

## Two Themes In One Application

The application serves two surfaces with different jobs: the admin panel behind login,
and the public site at the root. They do not share a visual language — the site uses
serif headlines, near-square corners and a fixed navy palette, the panel does not — and
the site has no dark mode.

They are kept apart by naming, not by discipline:

- The panel uses the tokens in `styles/theme.css`: `bg-primary`, `text-foreground`.
- The public site uses the tokens in `styles/site.css`, all prefixed `site-`:
  `bg-site-primary`, `font-site-display`, `max-w-site`.

Reusing a token name across the two files would repaint the other surface, so the
prefix is the whole safety mechanism. Site colours are literal values rather than
variables, which is why the `dark` class cannot reach them; `[data-site]` additionally
pins `color-scheme: light` so native controls follow.

Do not build public-site screens out of the panel's shadcn primitives. They carry the
panel's radius, typography and dark-mode behaviour. `features/site/components/` holds
the site's own small set: section, heading, card, chip, button, frieze.

### La paleta del panel es la de Strapi

Los valores de `theme.css` son los del sistema de diseno de Strapi: es de donde viene el
contenido de esta plataforma y el panel al que el titular esta acostumbrado.

El morado tiene **dos tonos y no son intercambiables**. `#4945FF` vale como fondo de
boton —el blanco encima da 5.9:1— pero como texto sobre el fondo oscuro se queda en
3.0:1, por debajo de AA. Para texto y focos sobre oscuro va `#7B79FF`, que llega a 5.0:1.
Es lo mismo que hace Strapi.

Cambiar esta paleta **no toca el sitio publico**: sus tokens van prefijados `site-*` y
viven en `site.css`. Esa separacion es justo para esto.

### El emblema hace tambien de favicon

El archivo que se sube en Configuracion del sitio se usa en la cabecera y como icono de
la pestaña. `index.html` trae cuatro `link[rel=icon]` de la plantilla; cuando hay emblema
**se retiran todos** y se pone uno solo, porque con varios declarados el navegador elige
y podria no elegir el del titular.

Sin emblema no se toca nada y siguen los estaticos: mejor eso que una pestaña sin icono.

Solo afecta al sitio publico. El panel conserva los suyos: no pide `/api/public/site`, y
anadir esa peticion solo por el icono no compensa.

## Ownership And Documentation

Document meaningful contract changes in `frontend.md` or an ADR. When replacing a shared
primitive, migrate its consumers in one planned sequence and remove the obsolete variant.
