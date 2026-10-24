import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function run(...args) {
  return spawnSync(process.execPath, ["bin/classekit.mjs", ...args], { encoding: "utf8" });
}

const summary = run("summary", "examples/assessment.json");
assert.equal(summary.status, 0);
assert.equal(JSON.parse(summary.stdout).questionCount, 1);

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
