#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { parseAssessment, recommendReviewTags, scoreAssessment, serializeAssessment, serializeAssessmentCsv, serializeAssessmentHtml, serializeAssessmentMarkdown, shuffleAssessment, summarizeScoreAttempts } from "../dist/index.js";

const args = process.argv.slice(2);
const [command, assessmentPath, answersPath] = args;
const localeArgument = process.argv.find((argument) => argument.startsWith("--locale="));
const locale = localeArgument?.slice("--locale=".length) ?? "en";
const thresholdArgument = process.argv.find((argument) => argument.startsWith("--threshold="));
const threshold = thresholdArgument ? Number(thresholdArgument.slice("--threshold=".length)) : 70;
const seedArgument = process.argv.find((argument) => argument.startsWith("--seed="));
const seed = seedArgument ? Number(seedArgument.slice("--seed=".length)) : 1;

function usage() {
  console.error("Usage: classekit validate <assessment.json> | classekit score <assessment.json> <answers.json> | classekit recommend <assessment.json> <answers.json> [--threshold=70] | classekit shuffle <assessment.json> [--seed=42] | classekit stats <result-1.json> <result-2.json> ... | classekit export-csv <assessment.json> | classekit export-md <assessment.json> [--answers] [--locale=fr|en] | classekit export-html <assessment.json> [--answers] [--locale=fr|en]");
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
      const results = await Promise.all(resultPaths.map(readJson));
      console.log(JSON.stringify(summarizeScoreAttempts(results), null, 2));
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
          console.log(JSON.stringify(recommendReviewTags(assessment, await readJson(answersPath), threshold), null, 2));
        }
      } else if (command === "shuffle") {
        console.log(serializeAssessment(shuffleAssessment(assessment, seed)));
      } else {
      if (!answersPath) {
        usage();
      } else {
        const result = scoreAssessment(assessment, await readJson(answersPath));
        console.log(JSON.stringify(result, null, 2));
      }
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
