# @classekit/education-core

Portable assessment primitives for education software.

This package gives TypeScript applications a small, dependency-free interface for authoring and scoring assessments. It is designed for francophone education tools, offline-first applications, and teams that need predictable validation before publishing content.

Assessment documents use schema version `1` by default. Unsupported versions
are rejected explicitly so future migrations can be introduced safely.

Set `passingPercentage` to customize the success threshold; scored results
include a boolean `passed` field and default to a 50% threshold.

Supported question types are `single-choice`, `multiple-choice`, `true-false`
and `short-answer`. Multiple-choice answers are arrays and are scored without
depending on their order.

Short-answer questions may define `acceptedAnswers` for valid synonyms or
alternate spellings. These alternatives are normalized like the main answer
and preserved by CSV export/import.

Set `durationMinutes` to publish a validated time limit or estimated duration;
the value is included in Markdown and HTML exports.

Questions may define `estimatedSeconds` for a learner-facing time estimate. It
is validated as a positive number and preserved by CSV, Markdown and HTML
exports.

`learningObjectives` are also included in those exports so learners and
teachers can see the intended outcomes of an assessment.

Pass `{ partialCredit: true }` as the third argument to `scoreAssessment` to
award proportional points for partially correct multiple-choice answers.

## Install

```bash
npm install @classekit/education-core
```

## Example

```ts
import { createAssessment, scoreAssessment } from "@classekit/education-core";

const assessment = createAssessment({
  id: "fractions-1",
  title: "Fractions",
  subject: "Mathématiques",
  questions: [
    {
      id: "q1",
      prompt: "Quelle est la moitié de 10 ?",
      kind: "short-answer",
      points: 2,
      answer: "5",
    },
  ],
});

const result = scoreAssessment(assessment, { q1: "5" });
// { earnedPoints: 2, totalPoints: 2, percentage: 100, ... }
```

For dashboards or content review screens, use `summarizeAssessment(assessment)`
to obtain the number of questions, total points and distribution by question
type.

`getQuestionById` retrieves one question for editor screens, while
`listQuestionsByKind` supports filtered views without changing the assessment.

Assessments may also include `difficulty`, `tags` and `learningObjectives`.
Use `serializeAssessment` and `parseAssessment` to persist validated JSON.
Use `serializeScoreResult` and `parseScoreResult` to persist validated scoring
results with the same runtime checks used by statistics.
Answer scoring ignores differences in case and accents, so `élève` and
`ELEVE` are treated as equivalent.

Each scoring result also includes `details`, `correctQuestionIds`,
`incorrectQuestionIds` and `unansweredQuestionIds`, making it suitable for
feedback screens and teacher dashboards.

Use `classifyScore` to map a percentage to a performance band, and
`scoreAssessmentByTag` to summarize progress by skill or learning topic.

`summarizeAssessment` reports both the question-type distribution and the
difficulty distribution for dashboard or content-review views, plus the number
of questions with timing metadata and their combined estimated duration.

Use `summarizeScoreAttempts` to calculate averages, score ranges and pass
rates across repeated learner attempts.

Use `recommendReviewTags` to identify skills below a target percentage and
guide targeted revision activities.

The same aggregation is available from the CLI with `classekit stats` and any
number of saved score-result JSON files.
Use `classekit recommend` to output tags below a selected mastery threshold.
Imported results are checked with `isScoreResult` before they are aggregated.
The CLI validates submitted answer shapes before scoring or recommending review
tags, and `--partial-credit` enables proportional multiple-choice scoring.

Use `selectQuestions` to create focused views by tag, several required tags,
difficulty or question kind without mutating the original assessment.

Use `shuffleAssessment(assessment, seed)` to generate reproducible question
and choice variants while preserving the original assessment.

When handling untrusted JSON, call `isAssessmentInput` before passing data to
`createAssessment`. Invalid runtime shapes are rejected with a clear error.
`isQuestionInput` is available when validating individual records from an
importer or editor.
Use `validateAnswers` before scoring to detect unknown question IDs, answer
shapes incompatible with the question type, values outside the choices,
duplicate selections and invalid true/false values.
Malformed answer maps return structured validation issues instead of causing
an internal iteration error, and malformed CSV arrays are rejected before they
reach assessment validation.
Score-result guards also verify numeric bounds and the shape of every question
detail before repeated-attempt statistics are calculated.

Invalid authoring data throws `AssessmentValidationError`, whose `issues`
property contains structured `{ path, message }` entries for form UIs and CI.
Authoring validation also rejects blank explanations, empty choices, duplicate
learning objectives or multiple-choice answers, and answer shapes that do not
match the question kind.

## Design goals

- no runtime dependencies;
- deterministic validation and scoring;
- immutable caller input handling;
- useful in browser, server and offline-first applications;
- small interface with room for adapters such as PDF/DOCX exporters.

## Development

```bash
npm run check
npm run test:cli
npm run verify
```

`verify` compiles the package, runs both smoke suites and checks the package
contents with the same commands used by CI before publication.
`npm run test:cli` also exercises the CLI end to end, including successful
JSON/localized exports and expected non-zero error paths.

## CLI

After building, validate an assessment file or score submitted answers:

```bash
npx classekit validate examples/assessment.json
npx classekit validate examples/assessment.json --json
npx classekit summary examples/assessment.json
npx classekit score examples/assessment.json examples/answers.json --partial-credit
npx classekit recommend examples/assessment.json examples/answers.json --threshold=70
npx classekit shuffle examples/assessment.json --seed=42
npx classekit stats examples/result-perfect.json examples/result-empty.json
npx classekit export-json examples/assessment.json
npx classekit export-csv examples/assessment.json
npx classekit export-md examples/assessment.json
npx classekit export-md examples/assessment.json --answers
npx classekit export-html examples/assessment.json
```

For spreadsheet workflows, use `serializeAssessmentCsv` and
`parseAssessmentCsv`. The CSV format preserves choices, difficulty, tags,
question timing, hints and explanations; the imported result is validated
through the same core rules.

`export-md` creates a learner-facing Markdown document by default. Pass
`--answers` to include the correction key for teachers.

`summary` emits compact assessment metadata for dashboards. `export-json`
emits the normalized, validated assessment document.

Exports support English and French labels. For the CLI, pass
`--locale=fr` or `--locale=en`.
Unsupported locale values are rejected explicitly.

`serializeAssessmentHtml` and `export-html` produce escaped standalone HTML,
so prompts and titles can safely contain user-provided text.
The generated structure uses language metadata, ordered questions, fieldsets
and labelled sections to support keyboard and assistive-technology workflows.
Question difficulty and explanations are included in the generated feedback.
Questions may also define a non-empty `hint`, which is included in learner
Markdown and HTML supports.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions should include tests and preserve the package's dependency-free runtime.

## License

MIT
