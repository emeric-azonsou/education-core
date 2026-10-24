# Changelog

## Unreleased

- Added difficulty-specific question listing and validated min/max point filters.
- Added per-question estimated timing with validation and localized Markdown/HTML output.
- Extended CSV round trips to preserve timing, hints and explanations.
- Hardened assessment creation by copying top-level tags and learning objectives.
- Hardened runtime guards for malformed optional fields, answer maps and CSV arrays.
- Hardened score-result guards, scoring options, thresholds and unterminated CSV detection.
- Added timing totals to assessment summaries and multi-criteria question selection.
- Added score-result consistency checks for question IDs and point totals.
- Added validated score-result JSON persistence helpers.
- Added CLI answer validation and the `--partial-credit` scoring flag.
- Added CLI `summary` and `export-json` commands with localized export coverage.
- Added end-to-end CLI smoke coverage for output and error exit codes.
- Tightened authoring validation for metadata, choices and answer collections.
- Extended submitted-answer validation to choices, duplicate selections and true/false values.
- Added public API/package-manifest smoke tests and executable CLI metadata checks.
- Added structured score-result validation and the `validate-score` CLI command.
- Added field-level diagnostics for malformed score results and inconsistent totals.
- Improved HTML correction exports with selected states and appropriate input controls.
- Escaped user-provided Markdown content in titles, questions and feedback fields.
- Added a unified `verify`/`prepublishOnly` gate and expanded CI package checks.

## 0.2.0 - 2026-10-24

- Added multiple-choice questions and configurable partial credit.
- Added CSV, Markdown and escaped HTML exports.
- Added deterministic assessment shuffling and adaptive question selection.
- Added typed validation errors, schema versioning and passing thresholds.
- Added localized exports and repeated-attempt statistics.

## 0.1.0 - 2026-10-24

- Added assessment authoring validation.
- Added deterministic scoring for three question types.
- Added TypeScript declarations and smoke tests.
