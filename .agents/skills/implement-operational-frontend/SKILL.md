---
name: implement-operational-frontend
description: Build or refactor operational Next.js interfaces such as dashboards, admin panels, CRUD modules, tables, forms, dialogs, navigation, and responsive workflows. Use when a frontend task must follow the repository's shared UI patterns, reduce visual fatigue, hide technical details, and ship with complete interaction states.
---

# Implement Operational Frontend

## Load Context

Read:

- `AGENTS.md` and the nearest scoped instructions.
- Relevant product feature and acceptance criteria.
- `docs/architecture/frontend.md`.
- Pattern docs required by the task:
  - `docs/architecture/component-system.md`.
  - `docs/architecture/interface-design.md`.
  - `docs/architecture/data-tables.md`.
  - `docs/architecture/forms-and-workflows.md`.
  - `docs/architecture/feedback-and-states.md`.
  - `docs/architecture/navigation-responsive.md`.
- `docs/quality/frontend-checklist.md`.

## Workflow

1. Inspect the existing screen, shared components, API contract, permissions, and neighboring modules.
2. State the primary user task and choose the smallest suitable surface: table, modal, detail, dashboard, or full-page workflow.
3. Remove duplicated headings, summaries, cards, helper text, technical fields, and persistent feedback that do not help the task.
4. Reuse shared primitives before adding components. Extend the shared contract when behavior belongs across modules.
5. Implement every relevant state: loading, empty, filtered-empty, partial, pending, success, validation, permission, conflict, and unexpected failure.
6. Keep internal identifiers in values only. Render business labels and backend-generated references.
7. Verify permissions in UI and rely on backend enforcement as the authority.
8. Exercise keyboard, touch, responsive layouts, long content, light/dark themes, repeated actions, slow requests, and stale responses.
9. Run project verification and complete the frontend checklist.
10. Update architecture or feature docs when the workflow or shared component contract changes.

## Component Decisions

- Use the shared TanStack-based table for operational collections.
- Use React Hook Form and Zod for forms.
- Use shadcn/ui primitives and Lucide icons.
- Use a semantic toast for routine action results.
- Use inline field errors for correctable input.
- Use modal create/edit for short records.
- Use a full page for long, high-risk, multi-section workflows.
- Use searchable comboboxes or table-selection modals for relationships.
- Use persisted backend jobs for work that must survive modal close, navigation, or refresh.

## Guardrails

- Do not expose raw IDs, auth/framework names, provider internals, storage paths, secrets, or backend metadata without a documented operational need.
- Do not create a third navigation level.
- Do not invent module-specific pagination, toast, tooltip, date input, dialog, or table behavior.
- Do not nest cards or use decorative panels as page structure.
- Do not add KPI cards that repeat table information or do not change a decision.
- Do not leave routine success/loading banners in the page.
- Do not install registry components without inspecting and adapting their code to project tokens, accessibility, and shared contracts.
- Do not mark complete with overlap, clipped controls, unreadable tooltips, missing states, or theme regressions.
