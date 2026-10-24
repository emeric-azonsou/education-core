import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function run(...args) {
  return spawnSync(process.execPath, ["bin/classekit.mjs", ...args], { encoding: "utf8" });
}

const summary = run("summary", "examples/assessment.json");
assert.equal(summary.status, 0);
assert.equal(JSON.parse(summary.stdout).questionCount, 1);

const selected = run("select", "examples/assessment.json", "--min-points=2", "--max-points=2");
assert.equal(selected.status, 0);
assert.equal(JSON.parse(selected.stdout)[0].id, "q1");

const pagedSelection = run("select", "examples/assessment.json", "--offset=1", "--limit=1");
assert.equal(pagedSelection.status, 0);
assert.deepEqual(JSON.parse(pagedSelection.stdout), []);

const idSelection = run("select", "examples/assessment.json", "--ids=q1");
assert.equal(idSelection.status, 0);
assert.equal(JSON.parse(idSelection.stdout)[0].id, "q1");

const orderedSelection = run("select", "examples/assessment.json", "--order=points-desc", "--limit=1");
assert.equal(orderedSelection.status, 0);
assert.equal(JSON.parse(orderedSelection.stdout)[0].points, 2);

const timedSelection = run("select", "examples/assessment.json", "--min-time=1");
assert.equal(timedSelection.status, 0);
assert.deepEqual(JSON.parse(timedSelection.stdout), []);

const anyTagSelection = run("select", "examples/assessment.json", "--any-tags=fractions");
assert.equal(anyTagSelection.status, 0);
assert.deepEqual(JSON.parse(anyTagSelection.stdout), []);

const invalidSelection = run("select", "examples/assessment.json", "--min-points=3", "--max-points=1");
assert.equal(invalidSelection.status, 1);
assert.match(invalidSelection.stderr, /minPoints.*maxPoints/);

const invalidKind = run("select", "examples/assessment.json", "--kind=essay");
assert.equal(invalidKind.status, 1);
assert.match(invalidKind.stderr, /Unsupported question kind/);

const exported = run("export-json", "examples/assessment.json");
assert.equal(exported.status, 0);
assert.equal(JSON.parse(exported.stdout).id, "fractions-cli");

const frenchMarkdown = run("export-md", "examples/assessment.json", "--locale=fr");
assert.equal(frenchMarkdown.status, 0);
assert.match(frenchMarkdown.stdout, /Matière/);

const frenchHtml = run("export-html", "examples/assessment.json", "--locale=fr");
assert.equal(frenchHtml.status, 0);
assert.match(frenchHtml.stdout, /lang="fr"/);

const structuredValidation = run("validate", "examples/assessment.json", "--json");
assert.equal(structuredValidation.status, 0);
assert.equal(JSON.parse(structuredValidation.stdout).valid, true);

const scoreValidation = run("validate-score", "examples/result-perfect.json");
assert.equal(scoreValidation.status, 0);
assert.equal(JSON.parse(scoreValidation.stdout).valid, true);

const invalidScoreValidation = run("validate-score", "examples/invalid-result.json");
assert.equal(invalidScoreValidation.status, 1);
assert.equal(JSON.parse(invalidScoreValidation.stdout).valid, false);

const invalidAnswers = run("score", "examples/assessment.json", "examples/invalid-answers.json");
assert.equal(invalidAnswers.status, 1);
assert.match(invalidAnswers.stderr, /does not match an assessment question/);

const invalidLocale = run("export-md", "examples/assessment.json", "--locale=de");
assert.equal(invalidLocale.status, 1);
assert.match(invalidLocale.stderr, /locale must be en or fr/);

const invalidStats = run("stats", "examples/missing-result.json");
assert.equal(invalidStats.status, 1);

const missingCommand = run();
assert.equal(missingCommand.status, 2);
assert.match(missingCommand.stderr, /Usage: classekit/);

console.log("CLI smoke tests passed.");
