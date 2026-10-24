import assert from "node:assert/strict";
import {
  createAssessment,
  AssessmentValidationError,
  classifyScore,
  getQuestionById,
  isAssessmentInput,
  isQuestionInput,
  isScoreResult,
  listQuestionsByKind,
  normalizeAnswer,
  parseAssessmentCsv,
  parseAssessment,
  scoreAssessment,
  scoreAssessmentByTag,
  recommendReviewTags,
  summarizeScoreAttempts,
  selectQuestions,
  shuffleAssessment,
  serializeAssessmentHtml,
  serializeAssessmentCsv,
  serializeAssessmentMarkdown,
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
  durationMinutes: 30,
  questions: [
    {
      id: "q1",
      kind: "single-choice",
      prompt: "Quelle fraction est équivalente à 1/2 ?",
      choices: ["1/3", "2/4", "3/4"],
      answer: "2/4",
      points: 2,
      tags: ["fractions"],
      difficulty: "introductory",
      hint: "Cherche une fraction équivalente.",
      explanation: "Multiplier le numérateur et le dénominateur par 2.",
    },
    {
      id: "q2",
      kind: "true-false",
      prompt: "3/4 est supérieur à 1/2.",
      answer: "true",
      points: 1,
      tags: ["cycle-3"],
      difficulty: "intermediate",
    },
  ],
});

assert.equal(assessment.language, "fr");
assert.equal(assessment.schemaVersion, 1);
assert.equal(assessment.passingPercentage, 50);
assert.equal(assessment.totalPoints, 3);
assert.deepEqual(summarizeAssessment(assessment), {
  questionCount: 2,
  totalPoints: 3,
  questionKinds: {
    "single-choice": 1,
    "multiple-choice": 0,
    "true-false": 1,
    "short-answer": 0,
  },
  difficultyCounts: {
    introductory: 1,
    intermediate: 1,
    advanced: 0,
  },
});
assert.equal(getQuestionById(assessment, "q1")?.prompt, "Quelle fraction est équivalente à 1/2 ?");
assert.equal(getQuestionById(assessment, "missing"), undefined);
assert.equal(listQuestionsByKind(assessment, "true-false").length, 1);
assert.equal(selectQuestions(assessment, { tag: "FRACTIONS" }).length, 1);
assert.equal(selectQuestions(assessment, { difficulty: "intermediate" })[0].id, "q2");
const shuffledA = shuffleAssessment(assessment, 42);
const shuffledB = shuffleAssessment(assessment, 42);
assert.deepEqual(shuffledA, shuffledB);
assert.deepEqual(assessment.questions[0].choices, ["1/3", "2/4", "3/4"]);
assert.throws(() => shuffleAssessment(assessment, 1.5), /seed must be an integer/);
const multipleChoice = createAssessment({
  id: "multiple",
  title: "Choix multiples",
  subject: "Sciences",
  questions: [{
    id: "q1",
    kind: "multiple-choice",
    prompt: "Sélectionne les planètes telluriques",
    choices: ["Mercure", "Vénus", "Jupiter"],
    answer: ["Mercure", "Vénus"],
    points: 2,
  }],
});
assert.equal(scoreAssessment(multipleChoice, { q1: ["VÉNUS", "mercure"] }).percentage, 100);
const partialResult = scoreAssessment(multipleChoice, { q1: ["mercure"] }, { partialCredit: true });
assert.equal(partialResult.earnedPoints, 1);
assert.equal(partialResult.percentage, 50);
assert.equal(partialResult.correctQuestionIds.length, 0);
assert.throws(() => createAssessment({
  id: "invalid-multiple",
  title: "Invalid",
  subject: "Sciences",
  questions: [{
    id: "q1",
    kind: "multiple-choice",
    prompt: "Question",
    choices: ["A", "B"],
    answer: "A",
    points: 1,
  }],
}), /must be an array of choices/);
const acceptedAnswerAssessment = createAssessment({
  id: "accepted",
  title: "Réponses acceptées",
  subject: "Français",
  questions: [{
    id: "q1",
    kind: "short-answer",
    prompt: "Quel est un synonyme de rapide ?",
    answer: "vite",
    acceptedAnswers: ["rapidement", "VITE"],
    points: 1,
  }],
});
assert.equal(scoreAssessment(acceptedAnswerAssessment, { q1: "rapidement" }).percentage, 100);
assert.throws(() => createAssessment({
  id: "invalid-accepted",
  title: "Invalid",
  subject: "Français",
  questions: [{
    id: "q1",
    kind: "short-answer",
    prompt: "Question",
    answer: "oui",
    acceptedAnswers: ["Oui", "oui"],
    points: 1,
  }],
}), /acceptedAnswers.*must not contain duplicates/);
assert.equal(classifyScore(92), "mastery");
assert.equal(classifyScore(68), "developing");
assert.throws(() => classifyScore(101), /between 0 and 100/);
assert.deepEqual(scoreAssessmentByTag(assessment, { q1: "2/4", q2: "true" }), [
  { tag: "cycle-3", earnedPoints: 1, totalPoints: 1, percentage: 100 },
  { tag: "fractions", earnedPoints: 2, totalPoints: 2, percentage: 100 },
]);
assert.deepEqual(recommendReviewTags(assessment, { q1: "2/4", q2: "false" }), [
  { tag: "cycle-3", percentage: 0, earnedPoints: 0, totalPoints: 1 },
]);
assert.throws(() => recommendReviewTags(assessment, {}, 101), /between 0 and 100/);
assert.deepEqual(validateAnswers(assessment, { q1: "2/4", unknown: "answer" }), [
  { path: "answers.unknown", message: "does not match an assessment question" },
]);
assert.equal(normalizeAnswer("ÉLÈVE"), "eleve");
assert.equal(isAssessmentInput(assessment), true);
assert.equal(isAssessmentInput({ id: "broken" }), false);
assert.equal(isQuestionInput(assessment.questions[0]), true);
assert.equal(isQuestionInput(null), false);
assert.throws(() => createAssessment(/** @type {any} */ ({ id: "broken" })), /Invalid assessment input/);
try {
  createAssessment({ id: "", title: "", subject: "", questions: [] });
  assert.fail("Expected a typed validation error");
} catch (error) {
  assert.equal(error instanceof AssessmentValidationError, true);
  assert.equal(error.issues.length, 4);
}
assert.deepEqual(validateAssessmentInput({
  id: "malformed-question",
  title: "Malformed",
  subject: "Tests",
  questions: [null],
}), [{ path: "questions[0]", message: "must be a valid question object" }]);
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
assert.throws(() => parseAssessment("null"), /Invalid assessment document/);
assert.throws(() => createAssessment({
  id: "invalid-duration",
  title: "Invalid",
  subject: "Mathématiques",
  durationMinutes: 0,
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: "ok", points: 1 }],
}), /durationMinutes.*positive/);
assert.throws(() => createAssessment({
  id: "unsupported-schema",
  title: "Invalid",
  subject: "Tests",
  schemaVersion: 2,
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: "ok", points: 1 }],
}), /schemaVersion.*only schema version 1/);
const strictAssessment = createAssessment({
  id: "strict-pass",
  title: "Strict",
  subject: "Tests",
  passingPercentage: 80,
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: "ok", points: 1 }],
});
assert.equal(scoreAssessment(strictAssessment, { q1: "ok" }).passed, true);
assert.equal(scoreAssessment(strictAssessment, {}).passed, false);
assert.throws(() => createAssessment({
  id: "invalid-pass",
  title: "Invalid",
  subject: "Tests",
  passingPercentage: 101,
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: "ok", points: 1 }],
}), /passingPercentage.*between 0 and 100/);
assert.throws(() => createAssessment({
  id: "invalid-hint",
  title: "Invalid",
  subject: "Tests",
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", hint: " ", answer: "ok", points: 1 }],
}), /hint.*must not be empty/);

const csv = serializeAssessmentCsv(assessment);
assert.match(csv, /id,kind,prompt,answer,acceptedAnswers,points,choices,difficulty,tags/);
const csvRoundTrip = parseAssessmentCsv(csv, {
  id: "csv-copy",
  title: "Copie CSV",
  subject: "Mathématiques",
});
assert.equal(csvRoundTrip.questions.length, 2);
assert.equal(csvRoundTrip.questions[0].prompt, "Quelle fraction est équivalente à 1/2 ?");
const multipleCsv = parseAssessmentCsv(serializeAssessmentCsv(multipleChoice), {
  id: "multiple-csv",
  title: "Multiple CSV",
  subject: "Sciences",
});
assert.deepEqual(multipleCsv.questions[0].answer, ["Mercure", "Vénus"]);
const acceptedCsv = parseAssessmentCsv(serializeAssessmentCsv(acceptedAnswerAssessment), {
  id: "accepted-csv",
  title: "Accepted CSV",
  subject: "Français",
});
assert.deepEqual(acceptedCsv.questions[0].acceptedAnswers, ["rapidement", "VITE"]);
assert.throws(() => parseAssessmentCsv("bad,header\n", {
  id: "bad",
  title: "Bad",
  subject: "Bad",
}), /Invalid assessment CSV header/);

const markdown = serializeAssessmentMarkdown(assessment);
assert.match(markdown, /# Fractions de base/);
assert.match(markdown, /Duration:\*\* 30 minutes/);
assert.match(markdown, /Objectives:\*\* Comparer des fractions simples/);
assert.match(markdown, /Explanation:\*\* Multiplier le numérateur/);
assert.match(markdown, /Hint:\*\* Cherche une fraction équivalente/);
assert.doesNotMatch(markdown, /Answer/);
assert.match(serializeAssessmentMarkdown(assessment, true), /\*\*Answer:\*\* 2\/4/);
assert.match(serializeAssessmentMarkdown(assessment, false, "fr"), /Matière/);
assert.match(serializeAssessmentMarkdown(assessment, false, "fr"), /Questions/);
const html = serializeAssessmentHtml(assessment);
assert.match(html, /<!doctype html>/);
assert.match(html, /Mathématiques/);
assert.match(html, /Duration:<\/strong> 30 minutes/);
assert.match(html, /Objectives:<\/strong> Comparer des fractions simples/);
assert.match(html, /Difficulty:<\/strong> introductory/);
assert.match(html, /Explanation:<\/strong> Multiplier le numérateur/);
assert.match(html, /Hint:<\/strong> Cherche une fraction équivalente/);
assert.match(html, /aria-labelledby="question-1"/);
assert.match(html, /<ol>/);
assert.match(serializeAssessmentHtml(assessment, false, "fr"), /Matière:<\/strong>/);
assert.doesNotMatch(html, /Answer:/);
assert.match(serializeAssessmentHtml(createAssessment({
  id: "unsafe",
  title: "<script>",
  subject: "Web",
  questions: [{ id: "q1", kind: "short-answer", prompt: "<img>", answer: "ok", points: 1 }],
}), true), /&lt;script&gt;/);
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
  passed: true,
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
const perfectAttempt = scoreAssessment(assessment, { q1: "2/4", q2: "true" });
const emptyAttempt = scoreAssessment(assessment, {});
assert.deepEqual(summarizeScoreAttempts([perfectAttempt, scoreAssessment(assessment, { q1: "2/4", q2: "false" }), emptyAttempt]), {
  attemptCount: 3,
  averagePercentage: 55.56,
  highestPercentage: 100,
  lowestPercentage: 0,
  passRate: 66.67,
});
assert.deepEqual(summarizeScoreAttempts([]), {
  attemptCount: 0,
  averagePercentage: 0,
  highestPercentage: 0,
  lowestPercentage: 0,
  passRate: 0,
});
assert.throws(() => summarizeScoreAttempts([perfectAttempt], 101), /between 0 and 100/);
assert.equal(isScoreResult(perfectAttempt), true);
assert.equal(isScoreResult({ percentage: 100 }), false);
assert.throws(() => summarizeScoreAttempts(/** @type {any} */ ([{ percentage: 100 }])), /Invalid score result/);

const unanswered = scoreAssessment(assessment, { q1: "" });
assert.deepEqual(unanswered.unansweredQuestionIds, ["q1", "q2"]);
assert.deepEqual(unanswered.incorrectQuestionIds, ["q1", "q2"]);

console.log("Smoke tests passed.");
