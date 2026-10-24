import assert from "node:assert/strict";
import {
  createAssessment,
  AssessmentValidationError,
  classifyScore,
  getQuestionById,
  isAssessmentInput,
  isQuestionInput,
  isScoreResult,
  listQuestionsByDifficulty,
  listQuestionsByIds,
  listQuestionsByKind,
  listQuestionsByTag,
  normalizeAnswer,
  parseAssessmentCsv,
  parseAssessment,
  parseScoreResult,
  scoreAssessment,
  scoreAssessmentByTag,
  recommendReviewTags,
  summarizeQuestionSelection,
  summarizeScoreAttempts,
  selectQuestions,
  shuffleAssessment,
  serializeAssessmentHtml,
  serializeAssessmentCsv,
  serializeAssessmentMarkdown,
  serializeAssessment,
  serializeScoreResult,
  summarizeAssessment,
  validateAnswers,
  validateAssessmentInput,
  validateScoreResult,
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
      estimatedSeconds: 45,
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

const mutableTags = ["immutable"];
const mutableObjectives = ["Tester la copie défensive"];
const immutableAssessment = createAssessment({
  id: "immutable",
  title: "Immutabilité",
  subject: "Tests",
  tags: mutableTags,
  learningObjectives: mutableObjectives,
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: "ok", points: 1 }],
});
mutableTags.push("changed");
mutableObjectives.push("changed");
assert.deepEqual(immutableAssessment.tags, ["immutable"]);
assert.deepEqual(immutableAssessment.learningObjectives, ["Tester la copie défensive"]);

assert.equal(assessment.language, "fr");
assert.equal(assessment.schemaVersion, 1);
assert.equal(assessment.passingPercentage, 50);
assert.equal(assessment.totalPoints, 3);
assert.deepEqual(summarizeAssessment(assessment), {
  questionCount: 2,
  totalPoints: 3,
  estimatedSeconds: 45,
  estimatedQuestionCount: 1,
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
  tagCounts: {
    fractions: 1,
    "cycle-3": 1,
  },
});
assert.deepEqual(summarizeQuestionSelection(assessment.questions), {
  questionCount: 2,
  totalPoints: 3,
  estimatedSeconds: 45,
  estimatedQuestionCount: 1,
});
assert.equal(getQuestionById(assessment, "q1")?.prompt, "Quelle fraction est équivalente à 1/2 ?");
assert.equal(getQuestionById(assessment, "missing"), undefined);
assert.deepEqual(listQuestionsByIds(assessment, ["q2", "q1"]).map((question) => question.id), ["q2", "q1"]);
assert.throws(() => listQuestionsByIds(assessment, ["missing"]), /Unknown question ID/);
assert.throws(() => listQuestionsByIds(assessment, ["q1", "q1"]), /IDs.*duplicates/);
assert.equal(listQuestionsByTag(assessment, "FRACTIONS")[0].id, "q1");
assert.equal(listQuestionsByTag(assessment, "missing").length, 0);
assert.throws(() => listQuestionsByKind(assessment, /** @type {any} */ ("essay")), /Unsupported question kind/);
assert.throws(() => listQuestionsByDifficulty(assessment, /** @type {any} */ ("expert")), /Unsupported difficulty/);
assert.equal(listQuestionsByDifficulty(assessment, "introductory")[0].id, "q1");
assert.equal(listQuestionsByKind(assessment, "true-false").length, 1);
assert.equal(selectQuestions(assessment, { tag: "FRACTIONS" }).length, 1);
assert.equal(selectQuestions(assessment, { difficulty: "intermediate" })[0].id, "q2");
assert.equal(selectQuestions(assessment, { kind: "single-choice" })[0].id, "q1");
assert.equal(selectQuestions(assessment, { tags: ["fractions", "cycle-3"] }).length, 0);
assert.equal(selectQuestions(assessment, { tags: ["fractions"] })[0].id, "q1");
assert.equal(selectQuestions(assessment, { anyTags: ["cycle-3", "fractions"] }).length, 2);
assert.equal(selectQuestions(assessment, { anyTags: ["fractions", "missing"] })[0].id, "q1");
assert.equal(selectQuestions(assessment, { excludeTags: ["fractions"] })[0].id, "q2");
assert.equal(selectQuestions(assessment, { anyTags: ["fractions", "cycle-3"], excludeTags: ["fractions"] })[0].id, "q2");
assert.equal(selectQuestions(assessment, { minPoints: 2 })[0].id, "q1");
assert.equal(selectQuestions(assessment, { maxPoints: 1 })[0].id, "q2");
assert.equal(selectQuestions(assessment, { offset: 1 })[0].id, "q2");
assert.equal(selectQuestions(assessment, { limit: 1 })[0].id, "q1");
assert.equal(selectQuestions(assessment, { offset: 1, limit: 1 })[0].id, "q2");
assert.deepEqual(selectQuestions(assessment, { ids: ["q2", "q1"] }).map((question) => question.id), ["q1", "q2"]);
assert.deepEqual(selectQuestions(assessment, { order: "points-desc" }).map((question) => question.id), ["q1", "q2"]);
assert.deepEqual(selectQuestions(assessment, { order: "points-asc" }).map((question) => question.id), ["q2", "q1"]);
assert.deepEqual(selectQuestions(assessment, { order: "time-asc" }).map((question) => question.id), ["q1", "q2"]);
assert.deepEqual(selectQuestions(assessment, { order: "time-desc" }).map((question) => question.id), ["q1", "q2"]);
assert.deepEqual(selectQuestions(assessment, { order: "difficulty-asc" }).map((question) => question.id), ["q1", "q2"]);
assert.deepEqual(selectQuestions(assessment, { order: "difficulty-desc" }).map((question) => question.id), ["q2", "q1"]);
assert.deepEqual(selectQuestions(assessment, { order: "kind-asc" }).map((question) => question.id), ["q1", "q2"]);
assert.deepEqual(selectQuestions(assessment, { order: "kind-desc" }).map((question) => question.id), ["q2", "q1"]);
assert.deepEqual(selectQuestions(assessment, { seed: 42 }), selectQuestions(assessment, { seed: 42 }));
assert.equal(selectQuestions(assessment, { seed: 42 }).length, 2);
assert.deepEqual(selectQuestions(assessment, { minEstimatedSeconds: 30 }).map((question) => question.id), ["q1"]);
assert.equal(selectQuestions(assessment, { maxEstimatedSeconds: 30 }).length, 0);
assert.throws(() => selectQuestions(assessment, { minPoints: -1 }), /minPoints.*finite non-negative/);
assert.throws(() => selectQuestions(assessment, { minPoints: 2, maxPoints: 1 }), /minPoints.*maxPoints/);
assert.throws(() => selectQuestions(assessment, /** @type {any} */ ({ kind: "essay" })), /Unsupported question kind/);
assert.throws(() => selectQuestions(assessment, /** @type {any} */ ({ tags: ["fractions", 1] })), /tags.*array of strings/);
assert.throws(() => selectQuestions(assessment, { anyTags: [] }), /anyTags.*non-empty array/);
assert.throws(() => selectQuestions(assessment, { excludeTags: [] }), /excludeTags.*non-empty array/);
assert.throws(() => selectQuestions(assessment, { seed: 1.5 }), /seed.*integer/);
assert.throws(() => selectQuestions(assessment, { offset: -1 }), /offset.*non-negative integer/);
assert.throws(() => selectQuestions(assessment, { limit: 1.5 }), /limit.*non-negative integer/);
assert.throws(() => selectQuestions(assessment, /** @type {any} */ ({ ids: [] })), /ids.*non-empty array/);
assert.throws(() => selectQuestions(assessment, { ids: ["q1", "q1"] }), /ids.*duplicates/);
assert.throws(() => selectQuestions(assessment, /** @type {any} */ ({ order: "random" })), /Unsupported question order/);
assert.throws(() => selectQuestions(assessment, { minEstimatedSeconds: 60, maxEstimatedSeconds: 30 }), /minEstimatedSeconds.*maxEstimatedSeconds/);
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
assert.throws(() => classifyScore(70, /** @type {any} */ (null)), /thresholds.*ordered/);
assert.throws(() => classifyScore(70, /** @type {any} */ ({ developing: 50, achieved: "70", mastery: 90 })), /thresholds.*ordered/);
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
assert.deepEqual(validateAnswers(assessment, /** @type {any} */ ({ q1: ["2/4"] })), [
  { path: "answers.q1", message: "must be a string for this question type" },
]);
assert.deepEqual(validateAnswers(multipleChoice, { q1: ["Mercure"] }), []);
assert.deepEqual(validateAnswers(multipleChoice, { q1: ["Mars"] }), [
  { path: "answers.q1", message: "must match one of the choices" },
]);
assert.deepEqual(validateAnswers(multipleChoice, { q1: ["Mercure", "mercure"] }), [
  { path: "answers.q1", message: "must not contain duplicate values" },
]);
assert.deepEqual(validateAnswers(assessment, { q1: "not-a-choice" }), [
  { path: "answers.q1", message: "must match one of the choices" },
]);
assert.deepEqual(validateAnswers(assessment, { q2: "maybe" }), [
  { path: "answers.q2", message: "must be true or false" },
]);
assert.deepEqual(validateAnswers(multipleChoice, /** @type {any} */ ({ q1: ["Mercure", 1] })), [
  { path: "answers.q1", message: "array values must be strings" },
]);
assert.deepEqual(validateAnswers(assessment, /** @type {any} */ (null)), [
  { path: "answers", message: "must be an object" },
]);
assert.throws(() => scoreAssessment(assessment, /** @type {any} */ (null)), /Answers must be an object/);
assert.equal(normalizeAnswer("ÉLÈVE"), "eleve");
assert.equal(isAssessmentInput(assessment), true);
assert.equal(isAssessmentInput({ id: "broken" }), false);
assert.equal(isQuestionInput(assessment.questions[0]), true);
assert.equal(isQuestionInput(null), false);
assert.equal(isQuestionInput({ id: "q", prompt: "Question", kind: "short-answer", points: 1, answer: "ok", choices: [1] }), false);
assert.equal(isQuestionInput({ id: "q", prompt: "Question", kind: "short-answer", points: 1, answer: ["ok", 1] }), false);
assert.deepEqual(validateAssessmentInput({ id: "bad-shape", title: "Bad", subject: "Tests", tags: "not-an-array", questions: [] }), [
  { path: "assessment", message: "must be a valid assessment object" },
]);
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
assert.throws(() => createAssessment({
  id: "invalid-language",
  title: "Invalid",
  subject: "Tests",
  language: " ",
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: "ok", points: 1 }],
}), /language.*must not be empty/);
assert.throws(() => createAssessment({
  id: "duplicate-objectives",
  title: "Invalid",
  subject: "Tests",
  learningObjectives: ["Comprendre", "comprendre"],
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: "ok", points: 1 }],
}), /learningObjectives.*duplicates/);
assert.throws(() => createAssessment({
  id: "invalid-explanation",
  title: "Invalid",
  subject: "Tests",
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", explanation: " ", answer: "ok", points: 1 }],
}), /explanation.*must not be empty/);
assert.throws(() => createAssessment({
  id: "invalid-choice",
  title: "Invalid",
  subject: "Tests",
  questions: [{ id: "q1", kind: "single-choice", prompt: "Question", choices: ["A", " "], answer: "A", points: 1 }],
}), /choices.*empty values/);
assert.throws(() => createAssessment({
  id: "invalid-answer-space",
  title: "Invalid",
  subject: "Tests",
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: " ", points: 1 }],
}), /answer.*empty values/);
assert.throws(() => createAssessment({
  id: "duplicate-answer",
  title: "Invalid",
  subject: "Tests",
  questions: [{ id: "q1", kind: "multiple-choice", prompt: "Question", choices: ["A", "B"], answer: ["A", "a"], points: 1 }],
}), /answer.*duplicates/);
assert.throws(() => createAssessment({
  id: "array-single",
  title: "Invalid",
  subject: "Tests",
  questions: [{ id: "q1", kind: "single-choice", prompt: "Question", choices: ["A", "B"], answer: ["A"], points: 1 }],
}), /answer.*must be a string/);
assert.throws(() => createAssessment({
  id: "invalid-estimate",
  title: "Invalid",
  subject: "Tests",
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question", answer: "ok", points: 1, estimatedSeconds: 0 }],
}), /estimatedSeconds.*positive/);

const csv = serializeAssessmentCsv(assessment);
assert.match(csv, /id,kind,prompt,answer,acceptedAnswers,points,choices,difficulty,tags,estimatedSeconds,hint,explanation/);
const csvRoundTrip = parseAssessmentCsv(csv, {
  id: "csv-copy",
  title: "Copie CSV",
  subject: "Mathématiques",
});
assert.equal(csvRoundTrip.questions.length, 2);
assert.equal(csvRoundTrip.questions[0].prompt, "Quelle fraction est équivalente à 1/2 ?");
assert.equal(csvRoundTrip.questions[0].estimatedSeconds, 45);
assert.equal(csvRoundTrip.questions[0].hint, "Cherche une fraction équivalente.");
assert.equal(csvRoundTrip.questions[0].explanation, "Multiplier le numérateur et le dénominateur par 2.");
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
const csvHeader = "id,kind,prompt,answer,acceptedAnswers,points,choices,difficulty,tags,estimatedSeconds,hint,explanation";
assert.throws(() => parseAssessmentCsv([
  csvHeader,
  'q1,short-answer,Question,ok,[],1,"[""A"",2]",,,,,',
].join("\n"), { id: "bad-csv", title: "Bad CSV", subject: "Tests" }), /Invalid assessment CSV JSON field/);
assert.throws(() => parseAssessmentCsv([
  csvHeader,
  'q1,short-answer,Question,ok,"[""ok"",3]",1,[],,,,,',
].join("\n"), { id: "bad-csv", title: "Bad CSV", subject: "Tests" }), /Invalid assessment CSV JSON field/);
assert.throws(() => parseAssessmentCsv(`${csvHeader}\nq1,short-answer,"Question`, {
  id: "bad-csv",
  title: "Bad CSV",
  subject: "Tests",
}), /unterminated quoted field/);

const markdown = serializeAssessmentMarkdown(assessment);
assert.match(markdown, /# Fractions de base/);
assert.match(markdown, /Duration:\*\* 30 minutes/);
assert.match(markdown, /Objectives:\*\* Comparer des fractions simples/);
assert.match(markdown, /Explanation:\*\* Multiplier le numérateur/);
assert.match(markdown, /Hint:\*\* Cherche une fraction équivalente/);
assert.match(markdown, /Estimated time:\*\* 45 seconds/);
assert.doesNotMatch(markdown, /Answer/);
assert.match(serializeAssessmentMarkdown(assessment, true), /\*\*Answer:\*\* 2\/4/);
assert.match(serializeAssessmentMarkdown(assessment, false, "fr"), /Matière/);
assert.match(serializeAssessmentMarkdown(assessment, false, "fr"), /Questions/);
const markdownEscaped = serializeAssessmentMarkdown(createAssessment({
  id: "markdown-safe",
  title: "*Titre* [test]",
  subject: "Sciences #1",
  questions: [{ id: "q1", kind: "short-answer", prompt: "Question _formatée_", answer: "`réponse`", points: 1, hint: "Indice *important*" }],
}), true);
assert.match(markdownEscaped, /\\\*Titre\\\* \\\[test\\\]/);
assert.match(markdownEscaped, /Question \\_formatée\\_/);
assert.equal(markdownEscaped.includes("\\`réponse\\`"), true);
assert.equal(markdownEscaped.includes("Indice \\*important\\*"), true);
const html = serializeAssessmentHtml(assessment);
assert.match(html, /<!doctype html>/);
assert.match(html, /Mathématiques/);
assert.match(html, /Duration:<\/strong> 30 minutes/);
assert.match(html, /Objectives:<\/strong> Comparer des fractions simples/);
assert.match(html, /Difficulty:<\/strong> introductory/);
assert.match(html, /Explanation:<\/strong> Multiplier le numérateur/);
assert.match(html, /Hint:<\/strong> Cherche une fraction équivalente/);
assert.match(html, /Estimated time:<\/strong> 45 seconds/);
assert.match(html, /aria-labelledby="question-1"/);
assert.match(html, /<ol>/);
assert.doesNotMatch(html, /checked/);
const answerHtml = serializeAssessmentHtml(assessment, true);
assert.match(answerHtml, /type="radio" checked disabled name="q1" value="1"/);
const multipleAnswerHtml = serializeAssessmentHtml(multipleChoice, true);
assert.match(multipleAnswerHtml, /type="checkbox" checked disabled name="q1" value="0"/);
assert.match(multipleAnswerHtml, /type="checkbox" checked disabled name="q1" value="1"/);
assert.match(serializeAssessmentHtml(assessment, false, "fr"), /Matière:<\/strong>/);
assert.throws(() => serializeAssessmentMarkdown(assessment, false, /** @type {any} */ ("de")), /locale must be en or fr/);
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
assert.equal(parseScoreResult(serializeScoreResult(perfectAttempt)).percentage, 100);
assert.throws(() => parseScoreResult("not-json"), /Invalid score result JSON/);
assert.throws(() => parseScoreResult(JSON.stringify({ percentage: 100 })), /Invalid score result document/);
assert.throws(() => serializeScoreResult(/** @type {any} */ ({ percentage: 100 })), /Invalid score result/);
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
assert.deepEqual(validateScoreResult(perfectAttempt), []);
assert.equal(isScoreResult({ percentage: 100 }), false);
assert.deepEqual(validateScoreResult({ percentage: 100 }).map((issue) => issue.path), [
  "scoreResult.earnedPoints",
  "scoreResult.totalPoints",
  "scoreResult.correctQuestionIds",
  "scoreResult.incorrectQuestionIds",
  "scoreResult.unansweredQuestionIds",
  "scoreResult.details",
  "scoreResult.passed",
]);
assert.equal(isScoreResult({ ...perfectAttempt, details: [{ questionId: "q1", expected: "ok", correct: true, earnedPoints: 2, maxPoints: 2, submitted: 7 }] }), false);
assert.equal(isScoreResult({ ...perfectAttempt, earnedPoints: 99 }), false);
assert.equal(isScoreResult({ ...perfectAttempt, incorrectQuestionIds: ["q1"], unansweredQuestionIds: ["q2"] }), false);
assert.equal(isScoreResult({ ...perfectAttempt, details: [...perfectAttempt.details, perfectAttempt.details[0]] }), false);
assert.throws(() => summarizeScoreAttempts(/** @type {any} */ ([{ percentage: 100 }])), /Invalid score result/);
assert.throws(() => summarizeScoreAttempts(/** @type {any} */ (null)), /Score results must be an array/);
assert.throws(() => scoreAssessment(assessment, /** @type {any} */ ({ q1: { answer: "2/4" } })), /Answers must contain only strings/);
assert.throws(() => scoreAssessment(assessment, {}, /** @type {any} */ ({ partialCredit: "yes" })), /Score options are invalid/);

const unanswered = scoreAssessment(assessment, { q1: "" });
assert.deepEqual(unanswered.unansweredQuestionIds, ["q1", "q2"]);
assert.deepEqual(unanswered.incorrectQuestionIds, ["q1", "q2"]);

console.log("Smoke tests passed.");
