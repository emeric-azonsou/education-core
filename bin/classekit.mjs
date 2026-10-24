#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { parseAssessment, scoreAssessment, serializeAssessment, serializeAssessmentCsv, serializeAssessmentHtml, serializeAssessmentMarkdown } from "../dist/index.js";

const [command, assessmentPath, answersPath] = process.argv.slice(2);
const localeArgument = process.argv.find((argument) => argument.startsWith("--locale="));
const locale = localeArgument?.slice("--locale=".length) ?? "en";

function usage() {
  console.error("Usage: classekit validate <assessment.json> | classekit score <assessment.json> <answers.json> | classekit export-csv <assessment.json> | classekit export-md <assessment.json> [--answers] [--locale=fr|en] | classekit export-html <assessment.json> [--answers] [--locale=fr|en]");
  process.exitCode = 2;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

if (!command || !assessmentPath || !["validate", "score", "export-csv", "export-md", "export-html"].includes(command)) {
  usage();
} else {
  try {
    const assessment = parseAssessment(await readFile(assessmentPath, "utf8"));
    if (command === "validate") {
      console.log(serializeAssessment(assessment));
    } else if (command === "export-csv") {
      console.log(serializeAssessmentCsv(assessment));
    } else if (command === "export-md") {
      console.log(serializeAssessmentMarkdown(assessment, process.argv.includes("--answers"), locale));
    } else if (command === "export-html") {
      console.log(serializeAssessmentHtml(assessment, process.argv.includes("--answers"), locale));
    } else {
      if (!answersPath) {
        usage();
      } else {
        const result = scoreAssessment(assessment, await readJson(answersPath));
        console.log(JSON.stringify(result, null, 2));
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
