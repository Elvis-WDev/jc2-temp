# Forms And Workflow Surfaces

## Select The Right Container

| Situation                                                | Container       |
| -------------------------------------------------------- | --------------- |
| Short create/edit form with independent fields           | Modal           |
| Quick confirmation or one decision                       | Alert dialog    |
| Contextual detail that benefits from list continuity     | Modal or drawer |
| Long form with several sections, calculations, or review | Full page       |
| High-risk operation with draft/validate/submit lifecycle | Full page       |
| Simple reversible value change                           | Inline control  |

Do not force every action into a modal. Do not embed every create/edit form permanently
inside a list module.

## Form Construction

- Use React Hook Form for state and Zod for validation.
- Reuse server-compatible schemas where practical, but translate messages into user language.
- Use persistent labels; placeholders are examples, not labels.
- Group fields by the user's mental model, not database tables.
- Keep required/optional behavior explicit.
- Validate format while typing only when it helps; show routine errors after touch or blur to avoid visual noise.
- Preserve entered values after recoverable server errors.
- Disable duplicate submission and expose a stable pending state.
- Focus the first invalid field and summarize only when the form is long.

Positive per-field messages should be reserved for sensitive or error-prone input. A
screen full of `Dato valido` text creates noise without improving confidence.

## Business-Facing Relationships

Never ask users to type a foreign key, UUID, auth account ID, storage key, or generated
code. Use:

- searchable comboboxes for moderate lists;
- a selection modal with the shared data table for large or filter-heavy lists;
- dependent selects for real hierarchies;
- read-only labels for backend-generated references;
- automatic backend numbering for internal identifiers.

The request may submit an ID, but the control displays the recognizable business label.

Selections across paginated modal tables persist until confirmed or cancelled.

## Conditional Fields

- Show fields only when they apply to the selected type or mode.
- Clear hidden values if they are no longer valid.
- Disable dependent controls until their prerequisite is selected.
- Explain the dependency once, near the disabled control.
- Derive defaults from authoritative configuration rather than hardcoding options in the screen.

## Sensitive Inputs And Files

- Passwords and secret values use masked inputs with a show/hide button.
- Edit forms preserve the existing secret when the field is empty.
- APIs return configuration presence, never plaintext or ciphertext.
- File inputs show filename, type, size, validation state, and replacement intent without exposing server paths.
- Validate sensitive files server-side; client extension checks are only early feedback.
- Never display secret references or certificate locations in tables.

## Date, Time, Number, And Option Inputs

- Use shared themed date/date-time components instead of inconsistent browser-native controls when the product design requires uniform behavior.
- Popovers dismiss on outside click and Escape, trap no unintended focus, and commit values predictably.
- Use steppers for bounded integer quantities; reject unsupported decimals.
- Format money and percentages for display while sending canonical numeric values.
- Use one business-facing tax/rate selector instead of exposing separate technical code and percentage fields when one option determines both.
- Load configurable catalogs from the backend; do not duplicate mutable business options in frontend constants.

## Modal Contract

Every modal should have:

- a concise title and optional one-line purpose;
- a visible, medium-size close icon with accessible name;
- focus moved inside on open and restored on close;
- Escape and overlay dismissal unless the operation cannot be safely abandoned;
- a scrollable body with stable header/footer for long forms;
- `Cancelar` and one clear primary action;
- responsive width and height constraints;
- no nested modal unless the workflow has no clearer full-page alternative.

Close the modal after a successful save, reset transient state, refresh the owning list,
and show a semantic toast. Keep it open with values intact after validation or server errors.

## Full-Page Workflow Contract

Use a full page when users must assemble, compare, calculate, review, or submit a complex
record. A good structure is:

1. Compact page/module header and reset/new action.
2. Main form in logical full-width sections.
3. Contextual summary or readiness panel only when it helps prevent mistakes.
4. Sticky or consistently located draft/validate/submit actions.
5. Clear lifecycle state and recovery path.

Do not hide essential context in nested dialogs. Do not consume a permanent right rail
for generic instructions that could be concise helper text.

## Import And Background Work

- Provide a downloadable template when a structured import format is required.
- Parse and validate before execution; report detected rows and actionable issues.
- Run durable imports as backend jobs.
- Show progress and allow the modal to close without cancelling the job.
- Make job state available after navigation or refresh.
- Report partial success with counts and a downloadable error file when useful.

## Edit And Delete Semantics

- Edit forms load current values from the authoritative source.
- Immutable fields appear as labels, not disabled mystery inputs.
- Prefer archive, deactivate, revoke, or soft delete when history and relationships matter.
- Explain consequences before destructive actions.
- Never let frontend cascade assumptions replace backend integrity rules.
