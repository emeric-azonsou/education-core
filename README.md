# @classekit/education-core

Portable assessment primitives for education software.

This package gives TypeScript applications a small, dependency-free interface for authoring and scoring assessments. It is designed for francophone education tools, offline-first applications, and teams that need predictable validation before publishing content.

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
Answer scoring ignores differences in case and accents, so `élève` and
`ELEVE` are treated as equivalent.

Each scoring result also includes `details`, `correctQuestionIds`,
`incorrectQuestionIds` and `unansweredQuestionIds`, making it suitable for
feedback screens and teacher dashboards.

## Design goals

- no runtime dependencies;
- deterministic validation and scoring;
- immutable caller input handling;
- useful in browser, server and offline-first applications;
- small interface with room for adapters such as PDF/DOCX exporters.

## Development

```bash
npm run check
```

The command compiles the package and runs the dependency-free smoke tests.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions should include tests and preserve the package's dependency-free runtime.

## License

MIT
