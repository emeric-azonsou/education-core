#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { parseAssessment, parseScoreResult, recommendReviewTags, scoreAssessment, serializeAssessment, serializeAssessmentCsv, serializeAssessmentHtml, serializeAssessmentMarkdown, shuffleAssessment, summarizeScoreAttempts, validateAnswers, validateAssessmentInput } from "../dist/index.js";

const args = process.argv.slice(2);
const [command, assessmentPath, answersPath] = args;
const localeArgument = process.argv.find((argument) => argument.startsWith("--locale="));
const locale = localeArgument?.slice("--locale=".length) ?? "en";
const thresholdArgument = process.argv.find((argument) => argument.startsWith("--threshold="));
const threshold = thresholdArgument ? Number(thresholdArgument.slice("--threshold=".length)) : 70;
const seedArgument = process.argv.find((argument) => argument.startsWith("--seed="));
const seed = seedArgument ? Number(seedArgument.slice("--seed=".length)) : 1;
const partialCredit = process.argv.includes("--partial-credit");

function usage() {
  console.error("Usage: classekit validate <assessment.json> [--json] | classekit score <assessment.json> <answers.json> [--partial-credit] | classekit recommend <assessment.json> <answers.json> [--threshold=70] | classekit shuffle <assessment.json> [--seed=42] | classekit stats <result-1.json> <result-2.json> ... | classekit export-csv <assessment.json> | classekit export-md <assessment.json> [--answers] [--locale=fr|en] | classekit export-html <assessment.json> [--answers] [--locale=fr|en]");
  process.exitCode = 2;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

if (!command || !assessmentPath || !["validate", "score", "recommend", "shuffle", "stats", "export-csv", "export-md", "export-html"].includes(command)) {
  usage();
} else {
  try {
    if (command === "stats") {
      const resultPaths = args.slice(1).filter((argument) => !argument.startsWith("--"));
      const results = await Promise.all(resultPaths.map(async (path) => parseScoreResult(await readFile(path, "utf8"))));
      console.log(JSON.stringify(summarizeScoreAttempts(results), null, 2));
    } else {
      const rawAssessment = process.argv.includes("--json") && command === "validate"
        ? await readJson(assessmentPath)
        : undefined;
      if (rawAssessment !== undefined) {
        const issues = validateAssessmentInput(rawAssessment);
        console.log(JSON.stringify({ valid: issues.length === 0, issues }, null, 2));
        if (issues.length > 0) process.exitCode = 1;
      } else {
        const assessment = parseAssessment(await readFile(assessmentPath, "utf8"));
      if (command === "validate") {
      console.log(serializeAssessment(assessment));
      } else if (command === "export-csv") {
      console.log(serializeAssessmentCsv(assessment));
      } else if (command === "export-md") {
      console.log(serializeAssessmentMarkdown(assessment, process.argv.includes("--answers"), locale));
      } else if (command === "export-html") {
      console.log(serializeAssessmentHtml(assessment, process.argv.includes("--answers"), locale));
      } else if (command === "recommend") {
        if (!answersPath) {
          usage();
        } else {
          const answers = await readValidatedAnswers(assessment, answersPath);
          console.log(JSON.stringify(recommendReviewTags(assessment, answers, threshold), null, 2));
        }
      } else if (command === "shuffle") {
        console.log(serializeAssessment(shuffleAssessment(assessment, seed)));
      } else {
      if (!answersPath) {
        usage();
      } else {
        const answers = await readValidatedAnswers(assessment, answersPath);
        const result = scoreAssessment(assessment, answers, { partialCredit });
        console.log(JSON.stringify(result, null, 2));
        }
      }
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function readValidatedAnswers(assessment, path) {
  const answers = await readJson(path);
  const issues = validateAnswers(assessment, answers);
  if (issues.length > 0) throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
  return answers;
}
