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

const SUPPORTED_KINDS = new Set<QuestionKind>(["single-choice", "true-false", "short-answer"]);
const SUPPORTED_DIFFICULTIES = new Set<Difficulty>(["introductory", "intermediate", "advanced"]);

/** Creates a normalized assessment and rejects invalid authoring data. */
export function createAssessment(input: AssessmentInput): Assessment {
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
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Invalid assessment document");
  }
  return createAssessment(input as AssessmentInput);
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
