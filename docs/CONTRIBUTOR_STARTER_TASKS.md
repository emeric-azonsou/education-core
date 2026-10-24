# Contributor starter tasks

These tasks are intentionally bounded so a first contribution can be reviewed
quickly. Please comment on the matching GitHub issue before starting, or open a
new issue if the task needs clarification.

Every example must use synthetic educational content. A useful contribution
should include tests when it changes behavior and should explain the learning
or assessment workflow it supports.

## Documentation and examples

- **English quick start** — add a short English example beside the existing
  French fixture, covering authoring, validation and deterministic scoring.
- **CSV round-trip guide** — document CSV export/import with choices, tags and
  timing metadata, including the fields that must be preserved.
- **Offline-first integration guide** — show how a browser or local classroom
  tool can use the package without a network connection or server runtime.
- **README translation** — translate one focused README section while keeping
  commands and API names exact.

## Tests and quality

- **CSV edge cases** — add fixtures and tests for escaped quotes, commas and
  CRLF line endings.
- **Selection combinations** — test combined include/exclude tag filters,
  time limits and empty result sets.
- **Synthetic scale check** — add a documented benchmark using a generated
  assessment with enough questions to reveal avoidable quadratic behavior.
- **Accessible HTML review** — review generated HTML with keyboard navigation
  and a screen reader checklist, then fix one reproducible issue with a test.

## Education-focused extensions

- **Science or vocational fixture** — add a realistic but synthetic assessment
  that demonstrates tags, difficulty and review metadata.
- **Locale-safe normalization** — document and test a French-language matching
  case without changing the package's deterministic behavior.
- **Content review example** — add a report or example that identifies
  untagged, untimed or otherwise incomplete questions before publication.
- **Document adapter boundary** — propose a small adapter interface for a
  document format while keeping format-specific dependencies outside the core
  runtime.

## Definition of done

A starter task is ready to review when the change is focused, documented,
covered by the relevant tests, compatible with the current public API (or has
explicit migration notes), and passes `npm run verify`.
