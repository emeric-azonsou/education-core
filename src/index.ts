export type QuestionKind = "single-choice" | "true-false" | "short-answer";
export type Difficulty = "introductory" | "intermediate" | "advanced";

export interface Question {
  id: string;
  prompt: string;
  kind: QuestionKind;
  points: number;
  choices?: readonly string[];
  answer: string;
  explanation?: string;
  difficulty?: Difficulty;
  tags?: readonly string[];
}

export interface AssessmentInput {
  id: string;
  title: string;
  subject: string;
  language?: string;
  difficulty?: Difficulty;
  tags?: readonly string[];
  learningObjectives?: readonly string[];
  questions: readonly Question[];
}

export interface Assessment extends AssessmentInput {
  language: string;
  totalPoints: number;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ScoreResult {
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  correctQuestionIds: readonly string[];
  incorrectQuestionIds: readonly string[];
  unansweredQuestionIds: readonly string[];
  details: readonly QuestionScore[];
}

export interface QuestionScore {
  questionId: string;
  submitted?: string;
  expected: string;
  correct: boolean;
  earnedPoints: number;
  maxPoints: number;
}

export interface AssessmentSummary {
  questionCount: number;
  totalPoints: number;
  questionKinds: Readonly<Record<QuestionKind, number>>;
}

export type PerformanceBand = "not-achieved" | "developing" | "achieved" | "mastery";

export interface PerformanceThresholds {
  developing: number;
  achieved: number;
  mastery: number;
}

export interface TagScore {
  tag: string;
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
}

const SUPPORTED_KINDS = new Set<QuestionKind>(["single-choice", "true-false", "short-answer"]);
const SUPPORTED_DIFFICULTIES = new Set<Difficulty>(["introductory", "intermediate", "advanced"]);

/** Creates a normalized assessment and rejects invalid authoring data. */
export function createAssessment(input: AssessmentInput): Assessment {
  if (!isAssessmentInput(input)) {
    throw new Error("Invalid assessment input");
  }
  const issues = validateAssessmentInput(input);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
  }

  const questions = input.questions.map((question) => ({
    ...question,
    ...(question.choices ? { choices: [...question.choices] } : {}),
    ...(question.tags ? { tags: [...question.tags] } : {}),
  }));

  return {
    ...input,
    language: input.language ?? "fr",
    questions,
    totalPoints: questions.reduce((total, question) => total + question.points, 0),
  };
}

/** Runtime guard for data received from JSON, APIs or storage adapters. */
export function isAssessmentInput(value: unknown): value is AssessmentInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.subject === "string" &&
    Array.isArray(candidate.questions);
}

/** Returns all authoring issues without throwing, which is useful for editors and CI. */
export function validateAssessmentInput(input: AssessmentInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.id.trim()) issues.push({ path: "id", message: "must not be empty" });
  if (!input.title.trim()) issues.push({ path: "title", message: "must not be empty" });
  if (!input.subject.trim()) issues.push({ path: "subject", message: "must not be empty" });
  if (input.difficulty && !SUPPORTED_DIFFICULTIES.has(input.difficulty)) {
    issues.push({ path: "difficulty", message: "is not supported" });
  }
  validateTags(input.tags, "tags", issues);
  if (input.learningObjectives?.some((objective) => !objective.trim())) {
    issues.push({ path: "learningObjectives", message: "must not contain empty values" });
  }
  if (input.questions.length === 0) issues.push({ path: "questions", message: "must contain at least one question" });

  const ids = new Set<string>();
  input.questions.forEach((question, index) => {
    const path = `questions[${index}]`;
    if (!question.id.trim()) issues.push({ path: `${path}.id`, message: "must not be empty" });
    if (ids.has(question.id)) issues.push({ path: `${path}.id`, message: "must be unique" });
    ids.add(question.id);
    if (!question.prompt.trim()) issues.push({ path: `${path}.prompt`, message: "must not be empty" });
    if (!SUPPORTED_KINDS.has(question.kind)) issues.push({ path: `${path}.kind`, message: "is not supported" });
    if (question.difficulty && !SUPPORTED_DIFFICULTIES.has(question.difficulty)) {
      issues.push({ path: `${path}.difficulty`, message: "is not supported" });
    }
    validateTags(question.tags, `${path}.tags`, issues);
    if (!Number.isFinite(question.points) || question.points <= 0) {
      issues.push({ path: `${path}.points`, message: "must be a positive number" });
    }
    if (question.kind === "single-choice" && (!question.choices || question.choices.length < 2)) {
      issues.push({ path: `${path}.choices`, message: "must contain at least two choices" });
    }
    if (question.choices) {
      const normalizedChoices = question.choices.map((choice) => choice.trim().toLowerCase());
      if (new Set(normalizedChoices).size !== normalizedChoices.length) {
        issues.push({ path: `${path}.choices`, message: "must not contain duplicates" });
      }
    }
    if (question.kind === "single-choice" && question.choices &&
        !question.choices.some((choice) => choice.trim().toLowerCase() === question.answer.trim().toLowerCase())) {
      issues.push({ path: `${path}.answer`, message: "must match one of the choices" });
    }
    if (question.kind === "true-false" && !["true", "false"].includes(question.answer.toLowerCase())) {
      issues.push({ path: `${path}.answer`, message: "must be true or false" });
    }
    if (!question.answer.trim()) issues.push({ path: `${path}.answer`, message: "must not be empty" });
  });

  return issues;
}

/** Scores a submitted answer map against an assessment. */
export function scoreAssessment(assessment: Assessment, answers: Readonly<Record<string, string>>): ScoreResult {
  const correctQuestionIds: string[] = [];
  const incorrectQuestionIds: string[] = [];
  const unansweredQuestionIds: string[] = [];
  const details: QuestionScore[] = [];
  let earnedPoints = 0;

  for (const question of assessment.questions) {
    const rawAnswer = answers[question.id];
    const submitted = rawAnswer === undefined ? undefined : normalizeAnswer(rawAnswer);
    const expected = normalizeAnswer(question.answer);
    const isUnanswered = submitted === undefined || submitted.length === 0;
    const correct = !isUnanswered && submitted === expected;
    if (correct) {
      earnedPoints += question.points;
      correctQuestionIds.push(question.id);
    } else {
      incorrectQuestionIds.push(question.id);
    }
    if (isUnanswered) unansweredQuestionIds.push(question.id);
    details.push({
      questionId: question.id,
      ...(rawAnswer === undefined ? {} : { submitted: rawAnswer }),
      expected: question.answer,
      correct,
      earnedPoints: correct ? question.points : 0,
      maxPoints: question.points,
    });
  }

  return {
    earnedPoints,
    totalPoints: assessment.totalPoints,
    percentage: assessment.totalPoints === 0 ? 0 : Math.round((earnedPoints / assessment.totalPoints) * 10000) / 100,
    correctQuestionIds,
    incorrectQuestionIds,
    unansweredQuestionIds,
    details,
  };
}

/** Checks submitted answer keys before scoring or persistence. */
export function validateAnswers(
  assessment: Assessment,
  answers: Readonly<Record<string, string>>,
): ValidationIssue[] {
  const questionIds = new Set(assessment.questions.map((question) => question.id));
  return Object.keys(answers)
    .filter((questionId) => !questionIds.has(questionId))
    .map((questionId) => ({
      path: `answers.${questionId}`,
      message: "does not match an assessment question",
    }));
}

/** Converts a percentage into a configurable pedagogical performance band. */
export function classifyScore(
  percentage: number,
  thresholds: PerformanceThresholds = { developing: 50, achieved: 70, mastery: 90 },
): PerformanceBand {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError("Percentage must be between 0 and 100");
  }
  if (!(thresholds.developing >= 0 && thresholds.developing <= thresholds.achieved &&
      thresholds.achieved <= thresholds.mastery && thresholds.mastery <= 100)) {
    throw new RangeError("Performance thresholds must be ordered between 0 and 100");
  }
  if (percentage >= thresholds.mastery) return "mastery";
  if (percentage >= thresholds.achieved) return "achieved";
  if (percentage >= thresholds.developing) return "developing";
  return "not-achieved";
}

/** Aggregates a score by question tags for skill-oriented feedback. */
export function scoreAssessmentByTag(
  assessment: Assessment,
  answers: Readonly<Record<string, string>>,
): readonly TagScore[] {
  const result = new Map<string, { earnedPoints: number; totalPoints: number }>();
  const score = scoreAssessment(assessment, answers);
  for (const detail of score.details) {
    const question = getQuestionById(assessment, detail.questionId);
    for (const tag of question?.tags ?? []) {
      const current = result.get(tag) ?? { earnedPoints: 0, totalPoints: 0 };
      current.earnedPoints += detail.earnedPoints;
      current.totalPoints += detail.maxPoints;
      result.set(tag, current);
    }
  }
  return [...result.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([tag, values]) => ({
    tag,
    ...values,
    percentage: values.totalPoints === 0 ? 0 : Math.round((values.earnedPoints / values.totalPoints) * 10000) / 100,
  }));
}

/** Normalizes human-entered answers for accent- and case-insensitive comparison. */
export function normalizeAnswer(value: string): string {
  return value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr-FR");
}

/** Serializes a validated assessment for storage or transport. */
export function serializeAssessment(assessment: Assessment): string {
  return JSON.stringify(assessment, null, 2);
}

/** Parses and validates an assessment JSON document. */
export function parseAssessment(json: string): Assessment {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new Error("Invalid assessment JSON");
  }
  if (!isAssessmentInput(input)) {
    throw new Error("Invalid assessment document");
  }
  return createAssessment(input as AssessmentInput);
}

/** Exports assessment questions as a spreadsheet-friendly CSV document. */
export function serializeAssessmentCsv(assessment: Assessment): string {
  const header = ["id", "kind", "prompt", "answer", "points", "choices", "difficulty", "tags"];
  const rows = assessment.questions.map((question) => [
    question.id,
    question.kind,
    question.prompt,
    question.answer,
    String(question.points),
    JSON.stringify(question.choices ?? []),
    question.difficulty ?? "",
    JSON.stringify(question.tags ?? []),
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

/** Renders an assessment as Markdown, optionally including the answer key. */
export function serializeAssessmentMarkdown(assessment: Assessment, includeAnswers = false): string {
  const lines = [`# ${assessment.title}`, "", `- **Subject:** ${assessment.subject}`, `- **Language:** ${assessment.language}`];
  if (assessment.difficulty) lines.push(`- **Difficulty:** ${assessment.difficulty}`);
  if (assessment.tags?.length) lines.push(`- **Tags:** ${assessment.tags.join(", ")}`);
  lines.push("", "## Questions", "");

  assessment.questions.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.prompt} *(${question.points} point${question.points === 1 ? "" : "s"})*`);
    if (question.choices?.length) {
      for (const choice of question.choices) {
        const marker = includeAnswers && normalizeAnswer(choice) === normalizeAnswer(question.answer) ? " [x]" : " [ ]";
        lines.push(`   -${marker} ${choice}`);
      }
    }
    if (includeAnswers) lines.push(`   - **Answer:** ${question.answer}`);
    if (question.explanation) lines.push(`   - **Explanation:** ${question.explanation}`);
    lines.push("");
  });
  return `${lines.join("\n").trim()}\n`;
}

/** Imports a question CSV document and validates the resulting assessment. */
export function parseAssessmentCsv(csv: string, metadata: Pick<AssessmentInput, "id" | "title" | "subject">): Assessment {
  const rows = parseCsvRows(csv);
  const [header, ...data] = rows;
  const expectedHeader = ["id", "kind", "prompt", "answer", "points", "choices", "difficulty", "tags"];
  if (!header || header.join("|") !== expectedHeader.join("|")) {
    throw new Error("Invalid assessment CSV header");
  }
  const questions = data.filter((row) => row.some((cell) => cell.trim())).map((row, index) => {
    if (row.length !== expectedHeader.length) throw new Error(`Invalid assessment CSV row ${index + 2}`);
    const value = (position: number): string => row[position] ?? "";
    let choices: string[] | undefined;
    let tags: string[] | undefined;
    try {
      choices = JSON.parse(value(5) || "[]") as string[];
      tags = JSON.parse(value(7) || "[]") as string[];
    } catch {
      throw new Error(`Invalid assessment CSV JSON field on row ${index + 2}`);
    }
    return {
      id: value(0),
      kind: value(1) as QuestionKind,
      prompt: value(2),
      answer: value(3),
      points: Number(value(4)),
      ...(choices.length ? { choices } : {}),
      ...(value(6) ? { difficulty: value(6) as Difficulty } : {}),
      ...(tags.length ? { tags } : {}),
    };
  });
  return createAssessment({ ...metadata, questions });
}

/** Returns lightweight metadata suitable for dashboards and content reviews. */
export function summarizeAssessment(assessment: Assessment): AssessmentSummary {
  const questionKinds: Record<QuestionKind, number> = {
    "single-choice": 0,
    "true-false": 0,
    "short-answer": 0,
  };

  for (const question of assessment.questions) {
    questionKinds[question.kind] += 1;
  }

  return {
    questionCount: assessment.questions.length,
    totalPoints: assessment.totalPoints,
    questionKinds,
  };
}

/** Finds one question by its stable identifier. */
export function getQuestionById(assessment: Assessment, questionId: string): Question | undefined {
  return assessment.questions.find((question) => question.id === questionId);
}

/** Returns all questions of a given kind while preserving their original order. */
export function listQuestionsByKind(assessment: Assessment, kind: QuestionKind): readonly Question[] {
  return assessment.questions.filter((question) => question.kind === kind);
}

function validateTags(tags: readonly string[] | undefined, path: string, issues: ValidationIssue[]): void {
  if (!tags) return;
  if (tags.some((tag) => !tag.trim())) issues.push({ path, message: "must not contain empty values" });
  const normalizedTags = tags.map((tag) => tag.trim().toLowerCase());
  if (new Set(normalizedTags).size !== normalizedTags.length) {
    issues.push({ path, message: "must not contain duplicates" });
  }
}

function escapeCsvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [[]];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      rows.at(-1)?.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      rows.at(-1)?.push(cell);
      rows.push([]);
      cell = "";
    } else {
      cell += character;
    }
  }
  rows.at(-1)?.push(cell);
  return rows;
}
