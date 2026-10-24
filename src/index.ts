export type QuestionKind = "single-choice" | "true-false" | "short-answer";

export interface Question {
  id: string;
  prompt: string;
  kind: QuestionKind;
  points: number;
  choices?: readonly string[];
  answer: string;
  explanation?: string;
}

export interface AssessmentInput {
  id: string;
  title: string;
  subject: string;
  language?: string;
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
}

export interface AssessmentSummary {
  questionCount: number;
  totalPoints: number;
  questionKinds: Readonly<Record<QuestionKind, number>>;
}

const SUPPORTED_KINDS = new Set<QuestionKind>(["single-choice", "true-false", "short-answer"]);

/** Creates a normalized assessment and rejects invalid authoring data. */
export function createAssessment(input: AssessmentInput): Assessment {
  const issues = validateAssessmentInput(input);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
  }

  const questions = input.questions.map((question) => question.choices
    ? { ...question, choices: [...question.choices] }
    : { ...question });

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
  if (input.questions.length === 0) issues.push({ path: "questions", message: "must contain at least one question" });

  const ids = new Set<string>();
  input.questions.forEach((question, index) => {
    const path = `questions[${index}]`;
    if (!question.id.trim()) issues.push({ path: `${path}.id`, message: "must not be empty" });
    if (ids.has(question.id)) issues.push({ path: `${path}.id`, message: "must be unique" });
    ids.add(question.id);
    if (!question.prompt.trim()) issues.push({ path: `${path}.prompt`, message: "must not be empty" });
    if (!SUPPORTED_KINDS.has(question.kind)) issues.push({ path: `${path}.kind`, message: "is not supported" });
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
  let earnedPoints = 0;

  for (const question of assessment.questions) {
    const submitted = answers[question.id]?.trim().toLowerCase();
    const expected = question.answer.trim().toLowerCase();
    if (submitted && submitted === expected) {
      earnedPoints += question.points;
      correctQuestionIds.push(question.id);
    } else {
      incorrectQuestionIds.push(question.id);
    }
  }

  return {
    earnedPoints,
    totalPoints: assessment.totalPoints,
    percentage: assessment.totalPoints === 0 ? 0 : Math.round((earnedPoints / assessment.totalPoints) * 10000) / 100,
    correctQuestionIds,
    incorrectQuestionIds,
  };
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
