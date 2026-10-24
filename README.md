# ClasseKit Education Core

[![CI](https://github.com/emeric-azonsou/education-core/actions/workflows/ci.yml/badge.svg)](https://github.com/emeric-azonsou/education-core/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](package.json)

Portable, dependency-free assessment primitives for education software.

ClasseKit Education Core gives learning tools a small, predictable foundation
for authoring, validating, scoring, filtering and exporting assessments. It is
designed for francophone education products, offline-first applications and
teams that need strong validation before content reaches learners.

The project is intentionally a core library, not a complete LMS and not an AI
tutor. It provides the deterministic building blocks that an LMS, editor,
mobile app or content pipeline can safely build on.

## Why this exists

Education products often duplicate the same fragile logic in several places:
question editors validate one shape, the learner app scores another, and export
tools silently lose metadata. ClasseKit centralizes those rules in one typed,
testable package.

The result is a useful boundary between authored content and learner-facing
experiences:

- invalid assessments fail before publication;
- scoring is deterministic and independent of network services;
- exports preserve pedagogical metadata such as objectives, tags, difficulty,
  hints and estimated time;
- the same core works in server, browser-bundled and offline-first workflows.

## What you get

### Assessment authoring and validation

- Four question kinds: `single-choice`, `multiple-choice`, `true-false` and
  `short-answer`.
- Schema versioning with explicit rejection of unsupported versions.
- Validation for choices, answers, duplicate IDs, tags, objectives, points,
  durations and passing thresholds.
- Structured `AssessmentValidationError.issues` values for editor forms and CI.
- Defensive copies so caller-owned arrays are not mutated by normalization.

### Deterministic scoring

- Case- and accent-insensitive answer matching.
- Accepted alternatives for short answers.
- Optional proportional partial credit for multiple-choice answers.
- Per-question scoring details and lists of correct, incorrect and unanswered
  questions.
- Performance bands, tag-level progress and review recommendations.

### Content selection and review

`selectQuestions` supports composable filters for:

- exact or excluded question IDs;
- one required tag, all required tags, any matching tag or excluded tags;
- difficulty and question kind;
- minimum/maximum points;
- minimum/maximum estimated time;
- presence or absence of difficulty, tags or timing metadata;
- deterministic ordering by points, time, difficulty or question kind;
- deterministic seeded selection, offset and limit pagination.

The CLI exposes the same workflow through `classekit select`, including
metadata audits and machine-friendly `--ids-only`, `--count-only` and
`--summary-only` output modes.

### Portable exports

- Validated JSON round trips.
- CSV import/export for spreadsheet workflows.
- Learner-facing Markdown with optional answer keys.
- Standalone escaped HTML with accessible labels and correction states.
- English and French export labels.

Markdown and HTML exports escape user-authored content. The package has no
runtime dependencies and does not require a database or external API.

## Quick start

```bash
git clone https://github.com/emeric-azonsou/education-core.git
cd education-core
npm install
npm run verify
```

The package is also structured for publication as `@classekit/education-core`;
the repository workflow is the canonical way to try the current source.

```ts
import {
  createAssessment,
  scoreAssessment,
  summarizeAssessment,
} from "@classekit/education-core";

const assessment = createAssessment({
  id: "fractions-1",
  title: "Fractions",
  subject: "Mathématiques",
  difficulty: "introductory",
  learningObjectives: ["Comparer des fractions simples"],
  questions: [
    {
      id: "q1",
      kind: "short-answer",
      prompt: "Quelle est la moitié de 10 ?",
      answer: "5",
      points: 2,
      estimatedSeconds: 30,
    },
  ],
});

const result = scoreAssessment(assessment, { q1: "5" });
console.log(result.percentage); // 100
console.log(summarizeAssessment(assessment).totalPoints); // 2
```

`createAssessment` validates the complete document and returns the normalized
assessment used by the rest of the API. Invalid authoring data raises a typed
error with field-level issues instead of producing a partially valid document.

## CLI workflow

After cloning the repository and installing dependencies:

```bash
npm run verify
```

Validate and inspect content:

```bash
node bin/classekit.mjs validate examples/assessment.json
node bin/classekit.mjs validate examples/assessment.json --json
node bin/classekit.mjs summary examples/assessment.json
node bin/classekit.mjs select examples/assessment.json \
  --any-tags=fractions,geometry \
  --min-points=2 \
  --order=difficulty-asc \
  --limit=10
node bin/classekit.mjs select examples/assessment.json --summary-only
node bin/classekit.mjs select examples/assessment.json --untagged-only --count-only
```

Score and analyze learner attempts:

```bash
node bin/classekit.mjs score examples/assessment.json examples/answers.json --partial-credit
node bin/classekit.mjs recommend examples/assessment.json examples/answers.json --threshold=70
node bin/classekit.mjs stats examples/result-perfect.json examples/result-empty.json
```

Export for other tools:

```bash
node bin/classekit.mjs export-json examples/assessment.json
node bin/classekit.mjs export-csv examples/assessment.json
node bin/classekit.mjs export-md examples/assessment.json --locale=fr
node bin/classekit.mjs export-html examples/assessment.json --locale=fr
```

Run `node bin/classekit.mjs` without a valid command to see the complete usage syntax.

## API map

| Need | Main API |
| --- | --- |
| Create and validate content | `createAssessment`, `validateAssessmentInput` |
| Score learner answers | `scoreAssessment`, `validateAnswers` |
| Analyze attempts | `classifyScore`, `scoreAssessmentByTag`, `summarizeScoreAttempts` |
| Select content | `selectQuestions`, `listQuestionsByIds`, `listQuestionsByTag` |
| Summarize content | `summarizeAssessment`, `summarizeQuestionSelection` |
| Persist results | `serializeAssessment`, `parseAssessment`, `serializeScoreResult`, `parseScoreResult` |
| Export content | `serializeAssessmentCsv`, `serializeAssessmentMarkdown`, `serializeAssessmentHtml` |
| Create variants | `shuffleAssessment` |

## Design principles

- **Deterministic first:** the same input and seed produce the same result.
- **Validate at the boundary:** malformed authoring data is rejected before it
  reaches scoring or export code.
- **Offline-friendly:** core scoring and validation do not need a server,
  database, model or network connection.
- **Content-preserving:** exports retain learning objectives, tags, difficulty,
  hints, explanations and timing metadata.
- **Small surface area:** adapters can be added around the core without forcing
  a framework, storage layer or runtime dependency on consumers.
- **Privacy by default:** the library does not transmit learner answers or
  authored content anywhere.

## Quality and verification

The repository includes:

- TypeScript compilation with generated declarations;
- public API export checks;
- unit-style smoke coverage for validation, scoring and serialization;
- end-to-end CLI smoke tests, including expected error paths;
- CI on Node.js 20, 22 and 24;
- a package dry-run check before publication.

Run the full local gate with:

```bash
npm run verify
```

`verify` builds the package, runs the API and CLI suites, and checks the
publishable package contents. No claim of production adoption is made yet:
this is an early-stage open-source core whose next milestone is adoption by
real education tools and contributors.

## Repository structure

```text
src/index.ts          Core types, validation, scoring, selection and exports
bin/classekit.mjs     CLI entry point
examples/             Small assessment and score-result fixtures
test/                 API, public-export and CLI smoke tests
.github/workflows/    Node.js CI and package checks
```

## Roadmap

- Add adapters for richer document formats without expanding the core runtime.
- Grow fixtures for primary, secondary and vocational education contexts.
- Add integrations contributed by education-tool maintainers.
- Measure real-world usage and accessibility outcomes before making adoption
  claims.

Roadmap items are deliberately modest: correctness, portability and useful
education workflows come before feature volume.

## Contributing

Start with the [contribution guide](CONTRIBUTING.md) and the
[starter tasks](docs/CONTRIBUTOR_STARTER_TASKS.md). The easiest first
contributions are focused tests, documentation, synthetic examples and
accessibility improvements. Every behavior change should include verification
and explain its educational use case.

Please do not include student data, credentials, API keys or proprietary
curriculum content in issues or pull requests.

## License

MIT
