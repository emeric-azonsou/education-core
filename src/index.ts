export type QuestionKind = "single-choice" | "multiple-choice" | "true-false" | "short-answer";
export type Difficulty = "introductory" | "intermediate" | "advanced";
export type AnswerValue = string | readonly string[];
export type ExportLocale = "en" | "fr";

export interface Question {
  id: string;
  prompt: string;
  kind: QuestionKind;
  points: number;
  choices?: readonly string[];
  answer: AnswerValue;
  acceptedAnswers?: readonly string[];
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
  durationMinutes?: number;
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

export interface ScoreOptions {
  partialCredit?: boolean;
}

export interface QuestionScore {
  questionId: string;
  submitted?: AnswerValue;
  expected: AnswerValue;
  correct: boolean;
  earnedPoints: number;
  maxPoints: number;
}

export interface AssessmentSummary {
  questionCount: number;
  totalPoints: number;
  questionKinds: Readonly<Record<QuestionKind, number>>;
  difficultyCounts: Readonly<Record<Difficulty, number>>;
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

export interface QuestionFilter {
  tag?: string;
  difficulty?: Difficulty;
}

const SUPPORTED_KINDS = new Set<QuestionKind>(["single-choice", "multiple-choice", "true-false", "short-answer"]);
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
    ...(Array.isArray(question.answer) ? { answer: [...question.answer] } : {}),
    ...(question.acceptedAnswers ? { acceptedAnswers: [...question.acceptedAnswers] } : {}),
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
  if (input.durationMinutes !== undefined &&
      (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0)) {
    issues.push({ path: "durationMinutes", message: "must be a positive number" });
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
    if ((question.kind === "single-choice" || question.kind === "multiple-choice") &&
        (!question.choices || question.choices.length < 2)) {
      issues.push({ path: `${path}.choices`, message: "must contain at least two choices" });
    }
    if (question.choices) {
      const normalizedChoices = question.choices.map((choice) => choice.trim().toLowerCase());
      if (new Set(normalizedChoices).size !== normalizedChoices.length) {
        issues.push({ path: `${path}.choices`, message: "must not contain duplicates" });
      }
    }
    const answerValues = getAnswerValues(question.answer);
    if (answerValues.length === 0) {
      issues.push({ path: `${path}.answer`, message: "must not be empty" });
    }
    if (question.kind === "multiple-choice" && !Array.isArray(question.answer)) {
      issues.push({ path: `${path}.answer`, message: "must be an array of choices" });
    }
    if ((question.kind === "single-choice" || question.kind === "multiple-choice") && question.choices &&
        answerValues.some((answer) => !question.choices?.some((choice) => normalizeAnswer(choice) === normalizeAnswer(answer)))) {
      issues.push({ path: `${path}.answer`, message: "must match one of the choices" });
    }
    if (question.kind === "true-false" && typeof question.answer === "string" &&
        !["true", "false"].includes(normalizeAnswer(question.answer))) {
      issues.push({ path: `${path}.answer`, message: "must be true or false" });
    }
    if (question.acceptedAnswers) {
      if (question.kind === "multiple-choice") {
        issues.push({ path: `${path}.acceptedAnswers`, message: "is not supported for multiple-choice questions" });
      }
      if (question.acceptedAnswers.some((answer) => !answer.trim())) {
        issues.push({ path: `${path}.acceptedAnswers`, message: "must not contain empty values" });
      }
      const normalizedAccepted = question.acceptedAnswers.map(normalizeAnswer);
      if (new Set(normalizedAccepted).size !== normalizedAccepted.length) {
        issues.push({ path: `${path}.acceptedAnswers`, message: "must not contain duplicates" });
      }
    }
  });

  return issues;
}

/** Scores a submitted answer map against an assessment. */
export function scoreAssessment(
  assessment: Assessment,
  answers: Readonly<Record<string, AnswerValue>>,
  options: ScoreOptions = {},
): ScoreResult {
  const correctQuestionIds: string[] = [];
  const incorrectQuestionIds: string[] = [];
  const unansweredQuestionIds: string[] = [];
  const details: QuestionScore[] = [];
  let earnedPoints = 0;

  for (const question of assessment.questions) {
    const rawAnswer = answers[question.id];
    const submitted = rawAnswer === undefined ? undefined : normalizeAnswerValue(rawAnswer);
    const expected = question.answer;
    const isUnanswered = submitted === undefined || submitted.length === 0;
    const correct = !isUnanswered && [expected, ...(question.acceptedAnswers ?? [])]
      .some((candidate) => answersMatch(submitted, candidate));
    const earnedQuestionPoints = correct
      ? question.points
      : options.partialCredit && question.kind === "multiple-choice"
        ? partialMultipleChoicePoints(submitted ?? "", expected, question.points)
        : 0;
    earnedPoints += earnedQuestionPoints;
    if (correct) {
      correctQuestionIds.push(question.id);
    } else {
      incorrectQuestionIds.push(question.id);
    }
    if (isUnanswered) unansweredQuestionIds.push(question.id);
    details.push({
      questionId: question.id,
      ...(rawAnswer === undefined ? {} : { submitted: rawAnswer }),
      expected,
      correct,
      earnedPoints: earnedQuestionPoints,
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

function partialMultipleChoicePoints(submitted: string | string[], expected: AnswerValue, points: number): number {
  if (!Array.isArray(submitted) || !Array.isArray(expected) || expected.length === 0) return 0;
  const expectedAnswers = new Set(expected.map(normalizeAnswer));
  const submittedAnswers = new Set(submitted);
  const hasWrongAnswer = [...submittedAnswers].some((answer) => !expectedAnswers.has(answer));
  if (hasWrongAnswer) return 0;
  const ratio = submittedAnswers.size / expectedAnswers.size;
  return Math.round(points * ratio * 100) / 100;
}

/** Checks submitted answer keys before scoring or persistence. */
export function validateAnswers(
  assessment: Assessment,
  answers: Readonly<Record<string, AnswerValue>>,
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
  answers: Readonly<Record<string, AnswerValue>>,
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

function normalizeAnswerValue(value: AnswerValue): string | string[] {
  return typeof value === "string" ? normalizeAnswer(value) : value.map((answer) => normalizeAnswer(answer)).filter(Boolean);
}

function getAnswerValues(value: AnswerValue): readonly string[] {
  return typeof value === "string" ? [value] : [...value];
}

function answersMatch(submitted: string | string[], expected: AnswerValue): boolean {
  if (Array.isArray(expected)) {
    if (!Array.isArray(submitted)) return false;
    const actual = [...submitted].sort();
    const target = expected.map(normalizeAnswer).filter(Boolean).sort();
    return actual.length === target.length && actual.every((value, index) => value === target[index]);
  }
  return typeof submitted === "string" && typeof expected === "string" && submitted === normalizeAnswer(expected);
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
  const header = ["id", "kind", "prompt", "answer", "acceptedAnswers", "points", "choices", "difficulty", "tags"];
  const rows = assessment.questions.map((question) => [
    question.id,
    question.kind,
    question.prompt,
    serializeAnswerCell(question.answer),
    JSON.stringify(question.acceptedAnswers ?? []),
    String(question.points),
    JSON.stringify(question.choices ?? []),
    question.difficulty ?? "",
    JSON.stringify(question.tags ?? []),
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

/** Renders an assessment as Markdown, optionally including the answer key. */
export function serializeAssessmentMarkdown(assessment: Assessment, includeAnswers = false, locale: ExportLocale = "en"): string {
  const labels = exportLabels(locale);
  const lines = [`# ${assessment.title}`, "", `- **${labels.subject}:** ${assessment.subject}`, `- **${labels.language}:** ${assessment.language}`];
  if (assessment.difficulty) lines.push(`- **${labels.difficulty}:** ${assessment.difficulty}`);
  if (assessment.tags?.length) lines.push(`- **${labels.tags}:** ${assessment.tags.join(", ")}`);
  if (assessment.learningObjectives?.length) lines.push(`- **${labels.objectives}:** ${assessment.learningObjectives.join(", ")}`);
  if (assessment.durationMinutes) lines.push(`- **${labels.duration}:** ${assessment.durationMinutes} ${labels.minutes}`);
  lines.push("", `## ${labels.questions}`, "");

  assessment.questions.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.prompt} *(${question.points} point${question.points === 1 ? "" : "s"})*`);
    if (question.choices?.length) {
      for (const choice of question.choices) {
        const marker = includeAnswers && getAnswerValues(question.answer).some((answer) => normalizeAnswer(choice) === normalizeAnswer(answer)) ? " [x]" : " [ ]";
        lines.push(`   -${marker} ${choice}`);
      }
    }
    if (includeAnswers) lines.push(`   - **${labels.answer}:** ${getAnswerValues(question.answer).join(", ")}`);
    if (question.explanation) lines.push(`   - **${labels.explanation}:** ${question.explanation}`);
    lines.push("");
  });
  return `${lines.join("\n").trim()}\n`;
}

/** Renders an assessment as escaped, standalone HTML. */
export function serializeAssessmentHtml(assessment: Assessment, includeAnswers = false, locale: ExportLocale = "en"): string {
  const labels = exportLabels(locale);
  const questions = assessment.questions.map((question, index) => {
    const choices = question.choices?.length
      ? `<fieldset><legend>${labels.choices} ${index + 1}</legend><ul>${question.choices.map((choice, choiceIndex) => `<li><label><input type="checkbox" disabled name="q${index + 1}" value="${choiceIndex}"> ${escapeHtml(choice)}</label></li>`).join("")}</ul></fieldset>`
      : "";
    const answer = includeAnswers ? `<p><strong>${labels.answer}:</strong> ${escapeHtml(getAnswerValues(question.answer).join(", "))}</p>` : "";
    return `<li><section aria-labelledby="question-${index + 1}"><h2 id="question-${index + 1}">${escapeHtml(question.prompt)}</h2><p>${question.points} point${question.points === 1 ? "" : "s"}</p>${choices}${answer}</section></li>`;
  }).join("\n");
  const duration = assessment.durationMinutes ? `<p><strong>${labels.duration}:</strong> ${assessment.durationMinutes} ${labels.minutes}</p>` : "";
  const objectives = assessment.learningObjectives?.length ? `<p><strong>${labels.objectives}:</strong> ${assessment.learningObjectives.map(escapeHtml).join(", ")}</p>` : "";
  return `<!doctype html><html lang="${escapeHtml(assessment.language)}"><head><meta charset="utf-8"><title>${escapeHtml(assessment.title)}</title></head><body><main><h1>${escapeHtml(assessment.title)}</h1><p><strong>${labels.subject}:</strong> ${escapeHtml(assessment.subject)}</p>${objectives}${duration}<ol>${questions}</ol></main></body></html>\n`;
}

/** Imports a question CSV document and validates the resulting assessment. */
export function parseAssessmentCsv(csv: string, metadata: Pick<AssessmentInput, "id" | "title" | "subject">): Assessment {
  const rows = parseCsvRows(csv);
  const [header, ...data] = rows;
  const expectedHeader = ["id", "kind", "prompt", "answer", "acceptedAnswers", "points", "choices", "difficulty", "tags"];
  if (!header || header.join("|") !== expectedHeader.join("|")) {
    throw new Error("Invalid assessment CSV header");
  }
  const questions = data.filter((row) => row.some((cell) => cell.trim())).map((row, index) => {
    if (row.length !== expectedHeader.length) throw new Error(`Invalid assessment CSV row ${index + 2}`);
    const value = (position: number): string => row[position] ?? "";
    let choices: string[] | undefined;
    let acceptedAnswers: string[] | undefined;
    let tags: string[] | undefined;
    try {
      acceptedAnswers = JSON.parse(value(4) || "[]") as string[];
      choices = JSON.parse(value(6) || "[]") as string[];
      tags = JSON.parse(value(8) || "[]") as string[];
    } catch {
      throw new Error(`Invalid assessment CSV JSON field on row ${index + 2}`);
    }
    return {
      id: value(0),
      kind: value(1) as QuestionKind,
      prompt: value(2),
      answer: parseAnswerCell(value(3), index + 2),
      points: Number(value(5)),
      ...(acceptedAnswers.length ? { acceptedAnswers } : {}),
      ...(choices.length ? { choices } : {}),
      ...(value(7) ? { difficulty: value(7) as Difficulty } : {}),
      ...(tags.length ? { tags } : {}),
    };
  });
  return createAssessment({ ...metadata, questions });
}

/** Returns lightweight metadata suitable for dashboards and content reviews. */
export function summarizeAssessment(assessment: Assessment): AssessmentSummary {
  const questionKinds: Record<QuestionKind, number> = {
    "single-choice": 0,
    "multiple-choice": 0,
    "true-false": 0,
    "short-answer": 0,
  };
  const difficultyCounts: Record<Difficulty, number> = {
    introductory: 0,
    intermediate: 0,
    advanced: 0,
  };

  for (const question of assessment.questions) {
    questionKinds[question.kind] += 1;
    if (question.difficulty) difficultyCounts[question.difficulty] += 1;
  }

  return {
    questionCount: assessment.questions.length,
    totalPoints: assessment.totalPoints,
    questionKinds,
    difficultyCounts,
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

/** Selects questions for adaptive or topic-specific quiz views. */
export function selectQuestions(assessment: Assessment, filter: QuestionFilter): readonly Question[] {
  return assessment.questions.filter((question) => {
    const matchesTag = !filter.tag || question.tags?.some((tag) => normalizeAnswer(tag) === normalizeAnswer(filter.tag ?? ""));
    const matchesDifficulty = !filter.difficulty || question.difficulty === filter.difficulty;
    return matchesTag && matchesDifficulty;
  });
}

/** Creates a reproducible shuffled copy without mutating the source assessment. */
export function shuffleAssessment(assessment: Assessment, seed = 1): Assessment {
  if (!Number.isInteger(seed)) throw new RangeError("Shuffle seed must be an integer");
  const random = seededRandom(seed);
  const questions = assessment.questions.map((question) => ({
    ...question,
    ...(question.choices ? { choices: [...question.choices] } : {}),
  }));
  shuffleInPlace(questions, random);
  for (const question of questions) {
    if (question.choices) shuffleInPlace(question.choices as string[], random);
  }
  return { ...assessment, questions };
}

function validateTags(tags: readonly string[] | undefined, path: string, issues: ValidationIssue[]): void {
  if (!tags) return;
  if (tags.some((tag) => !tag.trim())) issues.push({ path, message: "must not contain empty values" });
  const normalizedTags = tags.map((tag) => tag.trim().toLowerCase());
  if (new Set(normalizedTags).size !== normalizedTags.length) {
    issues.push({ path, message: "must not contain duplicates" });
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!];
  }
}

function escapeCsvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function serializeAnswerCell(value: AnswerValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function parseAnswerCell(value: string, rowNumber: number): AnswerValue {
  if (!value.trim().startsWith("[")) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((answer) => typeof answer === "string")) return parsed;
  } catch {
    // Fall through to the contextual error below.
  }
  throw new Error(`Invalid answer field on row ${rowNumber}`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function exportLabels(locale: ExportLocale): {
  subject: string;
  language: string;
  difficulty: string;
  tags: string;
  objectives: string;
  duration: string;
  minutes: string;
  questions: string;
  choices: string;
  answer: string;
  explanation: string;
} {
  return locale === "fr"
    ? { subject: "Matière", language: "Langue", difficulty: "Difficulté", tags: "Tags", objectives: "Objectifs", duration: "Durée", minutes: "minutes", questions: "Questions", choices: "Choix pour la question", answer: "Réponse", explanation: "Explication" }
    : { subject: "Subject", language: "Language", difficulty: "Difficulty", tags: "Tags", objectives: "Objectives", duration: "Duration", minutes: "minutes", questions: "Questions", choices: "Choices for question", answer: "Answer", explanation: "Explanation" };
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
