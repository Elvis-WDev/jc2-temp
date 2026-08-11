# Code Review Guide

Review for bugs first.

## Priority Order

1. Correctness and data integrity.
2. Security and permission boundaries.
3. Behavioral regressions.
4. Missing tests or verification.
5. Architecture drift.
6. Maintainability.
7. Interface consistency and visual workload.

## Review Output

Findings should include:

- Severity.
- File and line reference.
- Why it matters.
- Suggested direction.

If there are no findings, say that clearly and mention residual risk or untested areas.

For frontend reviews, use `docs/quality/frontend-checklist.md`. Report duplicated
surfaces, inconsistent table behavior, technical language, missing states, overflow,
inaccessible controls, and visual fatigue as real product defects rather than cosmetic
preferences.
