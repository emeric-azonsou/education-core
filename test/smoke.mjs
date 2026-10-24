import assert from "node:assert/strict";
import {
  createAssessment,
  getQuestionById,
  listQuestionsByKind,
  normalizeAnswer,
  parseAssessment,
  scoreAssessment,
  serializeAssessment,
  summarizeAssessment,
  validateAnswers,
  validateAssessmentInput,
} from "../dist/index.js";

const assessment = createAssessment({
  id: "fractions-01",
  title: "Fractions de base",
  subject: "Mathématiques",
  difficulty: "introductory",
  tags: ["fractions", "cycle-3"],
  learningObjectives: ["Comparer des fractions simples"],
  questions: [
    {
      id: "q1",
      kind: "single-choice",
      prompt: "Quelle fraction est équivalente à 1/2 ?",
      choices: ["1/3", "2/4", "3/4"],
      answer: "2/4",
      points: 2,
    },
    {
      id: "q2",
      kind: "true-false",
      prompt: "3/4 est supérieur à 1/2.",
      answer: "true",
      points: 1,
    },
  ],
});

assert.equal(assessment.language, "fr");
assert.equal(assessment.totalPoints, 3);
assert.deepEqual(summarizeAssessment(assessment), {
  questionCount: 2,
  totalPoints: 3,
  questionKinds: {
    "single-choice": 1,
    "true-false": 1,
    "short-answer": 0,
  },
});
assert.equal(getQuestionById(assessment, "q1")?.prompt, "Quelle fraction est équivalente à 1/2 ?");
assert.equal(getQuestionById(assessment, "missing"), undefined);
assert.equal(listQuestionsByKind(assessment, "true-false").length, 1);
assert.deepEqual(validateAnswers(assessment, { q1: "2/4", unknown: "answer" }), [
  { path: "answers.unknown", message: "does not match an assessment question" },
]);
assert.equal(normalizeAnswer("ÉLÈVE"), "eleve");
assert.equal(scoreAssessment(createAssessment({
  id: "accents",
  title: "Accents",
  subject: "Français",
  questions: [{
    id: "q1",
    kind: "short-answer",
    prompt: "Écris le mot élève",
    answer: "élève",
    points: 1,
  }],
}), { q1: "ELEVE" }).percentage, 100);

const serialized = serializeAssessment(assessment);
assert.equal(parseAssessment(serialized).id, assessment.id);
assert.throws(() => parseAssessment("not-json"), /Invalid assessment JSON/);
assert.deepEqual(validateAssessmentInput({
  id: "",
  title: "",
  subject: "",
  questions: [],
}), [
  { path: "id", message: "must not be empty" },
  { path: "title", message: "must not be empty" },
  { path: "subject", message: "must not be empty" },
  { path: "questions", message: "must contain at least one question" },
]);

assert.throws(() => createAssessment({
  id: "invalid",
  title: "Invalid",
  subject: "Mathématiques",
  questions: [{
    id: "q1",
    kind: "single-choice",
    prompt: "Question sans choix",
    answer: "A",
    points: 1,
  }],
}), /must contain at least two choices/);

assert.deepEqual(validateAssessmentInput({
  id: "duplicates",
  title: "Choix invalides",
  subject: "Mathématiques",
  questions: [{
    id: "q1",
    kind: "single-choice",
    prompt: "Choisis une réponse",
    choices: ["Oui", "oui"],
    answer: "Non",
    points: 1,
  }],
}), [
  { path: "questions[0].choices", message: "must not contain duplicates" },
  { path: "questions[0].answer", message: "must match one of the choices" },
]);

assert.deepEqual(scoreAssessment(assessment, {
  q1: "2/4",
  q2: "false",
}), {
  earnedPoints: 2,
  totalPoints: 3,
  percentage: 66.67,
  correctQuestionIds: ["q1"],
  incorrectQuestionIds: ["q2"],
  unansweredQuestionIds: [],
  details: [
    {
      questionId: "q1",
      submitted: "2/4",
      expected: "2/4",
      correct: true,
      earnedPoints: 2,
      maxPoints: 2,
    },
    {
      questionId: "q2",
      submitted: "false",
      expected: "true",
      correct: false,
      earnedPoints: 0,
      maxPoints: 1,
    },
  ],
});

const unanswered = scoreAssessment(assessment, { q1: "" });
assert.deepEqual(unanswered.unansweredQuestionIds, ["q1", "q2"]);
assert.deepEqual(unanswered.incorrectQuestionIds, ["q1", "q2"]);

console.log("Smoke tests passed.");
