# Changelog

## Unreleased

- Added per-question estimated timing with validation and localized Markdown/HTML output.
- Extended CSV round trips to preserve timing, hints and explanations.
- Hardened assessment creation by copying top-level tags and learning objectives.
- Hardened runtime guards for malformed optional fields, answer maps and CSV arrays.
- Hardened score-result guards, scoring options, thresholds and unterminated CSV detection.

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
