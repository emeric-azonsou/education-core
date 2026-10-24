import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const api = await import("../dist/index.js");
const expectedExports = [
  "AssessmentValidationError", "classifyScore", "createAssessment", "getQuestionById",
  "isAssessmentInput", "isQuestionInput", "isScoreResult", "listQuestionsByKind",
  "normalizeAnswer", "parseAssessment", "parseAssessmentCsv", "parseScoreResult",
  "recommendReviewTags", "scoreAssessment", "scoreAssessmentByTag", "selectQuestions",
  "serializeAssessment", "serializeAssessmentCsv", "serializeAssessmentHtml",
  "serializeAssessmentMarkdown", "serializeScoreResult", "shuffleAssessment",
  "summarizeAssessment", "summarizeScoreAttempts", "validateAnswers", "validateAssessmentInput",
];

for (const exportName of expectedExports) assert.ok(exportName in api, `Missing public export: ${exportName}`);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(packageJson.exports["."].import, "./dist/index.js");
assert.equal(packageJson.exports["."].types, "./dist/index.d.ts");
assert.equal(packageJson.bin.classekit, "./bin/classekit.mjs");
assert.equal(packageJson.publishConfig.access, "public");

const assessment = api.parseAssessment(await readFile("examples/assessment.json", "utf8"));
assert.equal(assessment.id, "fractions-cli");
const score = api.parseScoreResult(await readFile("examples/result-perfect.json", "utf8"));
assert.equal(score.percentage, 100);
assert.equal(api.serializeScoreResult(score).includes('"passed": true'), true);

console.log("Public API smoke tests passed.");
