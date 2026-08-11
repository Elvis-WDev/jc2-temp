# Frontend Review Checklist

Use this checklist before completing any user-visible screen.

## Task And Hierarchy

- [ ] The primary user, task, and action are clear.
- [ ] The chosen surface matches the workflow: table, modal, detail, dashboard, or full page.
- [ ] Page title, module title, description, and summaries are not duplicated.
- [ ] Filters and actions are attached to the content they affect.
- [ ] No card, panel, KPI, helper text, or decorative element exists without a user benefit.
- [ ] The screen remains understandable without implementation knowledge.

## Data And Language

- [ ] Labels use business language.
- [ ] Raw IDs, enum tokens, provider names, storage paths, auth internals, and secret references are hidden.
- [ ] Relationships use searchable selectors or selection tables, not free-text IDs.
- [ ] Backend-generated values are not requested from the user.
- [ ] Numbers, money, dates, times, percentages, and empty values are consistently formatted.

## Tables

- [ ] Shared table and pagination components are used.
- [ ] Search, filters, sorting, columns, and row actions follow the application contract.
- [ ] Pagination is deterministic and matches every other module.
- [ ] Loading, empty collection, no matches, partial data, and error states are covered.
- [ ] Row actions are valid for permission and record state.
- [ ] Icon actions have opaque light/dark tooltips and accessible names.
- [ ] Mobile overflow and long values remain usable.

## Forms And Dialogs

- [ ] The form uses React Hook Form and Zod.
- [ ] Labels, required state, helper text, and errors are associated correctly.
- [ ] Conditional fields hide, clear, and validate correctly.
- [ ] Sensitive values remain masked and are never returned in plaintext.
- [ ] Duplicate submission is prevented.
- [ ] Failed submission preserves user input and focuses useful recovery context.
- [ ] Modal focus, Escape, close, overlay, scroll, and mobile behavior work.
- [ ] A complex or high-risk workflow uses a full page when a modal would be cramped.

## Feedback And State

- [ ] Every command has pending, success, and error feedback.
- [ ] Routine success/error uses the shared semantic toast.
- [ ] Persistent notices are reserved for persistent conditions.
- [ ] Toasts are not clipped and remain readable in both themes and mobile.
- [ ] Unknown errors are sanitized; diagnostics stay in logs.
- [ ] Durable background work survives closing a modal or navigating when required.
- [ ] Stale requests cannot overwrite newer scope or filter state.

## Navigation And Responsive

- [ ] Navigation has no more than two visible levels.
- [ ] Only the selected destination has the solid active state.
- [ ] Chevrons appear only on expandable parents.
- [ ] Desktop sidebar and mobile drawer expose the same authorized destinations.
- [ ] Header controls are stable, borderless where appropriate, and at least 44px targets.
- [ ] No overlap occurs at mobile, tablet, desktop, wide desktop, or 200% zoom.
- [ ] Long text wraps or truncates predictably.

## Theme And Accessibility

- [ ] Light and dark themes cover page, modal, popover, tooltip, toast, input, table, and charts.
- [ ] Keyboard-only navigation and visible focus work.
- [ ] Heading order and landmarks are logical.
- [ ] Status is not communicated only through color.
- [ ] Contrast and touch targets are sufficient.
- [ ] Reduced motion is respected for nonessential animation.

## Verification Evidence

- [ ] Relevant unit/component tests pass.
- [ ] Critical flow is covered by an integration or end-to-end test.
- [ ] Desktop and mobile screenshots were inspected when layout changed.
- [ ] Browser console has no new errors or hydration warnings.
- [ ] Lint, typecheck, test, and build commands pass.
