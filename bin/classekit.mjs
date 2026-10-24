#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { parseAssessment, scoreAssessment, serializeAssessment, serializeAssessmentCsv } from "../dist/index.js";

const [command, assessmentPath, answersPath] = process.argv.slice(2);

function usage() {
  console.error("Usage: classekit validate <assessment.json> | classekit score <assessment.json> <answers.json> | classekit export-csv <assessment.json>");
  process.exitCode = 2;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

if (!command || !assessmentPath || !["validate", "score", "export-csv"].includes(command)) {
  usage();
} else {
  try {
    const assessment = parseAssessment(await readFile(assessmentPath, "utf8"));
    if (command === "validate") {
      console.log(serializeAssessment(assessment));
    } else if (command === "export-csv") {
      console.log(serializeAssessmentCsv(assessment));
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
