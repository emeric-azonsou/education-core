#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { parseAssessment, parseScoreResult, recommendReviewTags, scoreAssessment, selectQuestions, serializeAssessment, serializeAssessmentCsv, serializeAssessmentHtml, serializeAssessmentMarkdown, shuffleAssessment, summarizeAssessment, summarizeQuestionSelection, summarizeScoreAttempts, validateAnswers, validateAssessmentInput, validateScoreResult } from "../dist/index.js";

const args = process.argv.slice(2);
const [command, assessmentPath, answersPath] = args;
const localeArgument = process.argv.find((argument) => argument.startsWith("--locale="));
const locale = localeArgument?.slice("--locale=".length) ?? "en";
const thresholdArgument = process.argv.find((argument) => argument.startsWith("--threshold="));
const threshold = thresholdArgument ? Number(thresholdArgument.slice("--threshold=".length)) : 70;
const seedArgument = process.argv.find((argument) => argument.startsWith("--seed="));
const seed = seedArgument ? Number(seedArgument.slice("--seed=".length)) : 1;
const tagArgument = process.argv.find((argument) => argument.startsWith("--tag="));
const tagsArgument = process.argv.find((argument) => argument.startsWith("--tags="));
const anyTagsArgument = process.argv.find((argument) => argument.startsWith("--any-tags="));
const excludeTagsArgument = process.argv.find((argument) => argument.startsWith("--exclude-tags="));
const idsArgument = process.argv.find((argument) => argument.startsWith("--ids="));
const excludeIdsArgument = process.argv.find((argument) => argument.startsWith("--exclude-ids="));
const difficultyArgument = process.argv.find((argument) => argument.startsWith("--difficulty="));
const kindArgument = process.argv.find((argument) => argument.startsWith("--kind="));
const minPointsArgument = process.argv.find((argument) => argument.startsWith("--min-points="));
const maxPointsArgument = process.argv.find((argument) => argument.startsWith("--max-points="));
const offsetArgument = process.argv.find((argument) => argument.startsWith("--offset="));
const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
const orderArgument = process.argv.find((argument) => argument.startsWith("--order="));
const minTimeArgument = process.argv.find((argument) => argument.startsWith("--min-time="));
const maxTimeArgument = process.argv.find((argument) => argument.startsWith("--max-time="));
const partialCredit = process.argv.includes("--partial-credit");
const idsOnly = process.argv.includes("--ids-only");
const countOnly = process.argv.includes("--count-only");
const summaryOnly = process.argv.includes("--summary-only");
const timedOnly = process.argv.includes("--timed-only");
const untimedOnly = process.argv.includes("--untimed-only");
const difficultyOnly = process.argv.includes("--with-difficulty");
const withoutDifficulty = process.argv.includes("--without-difficulty");
const taggedOnly = process.argv.includes("--tagged-only");
const untaggedOnly = process.argv.includes("--untagged-only");

function usage() {
  console.error("Usage: classekit validate <assessment.json> [--json] | classekit validate-score <result.json> | classekit summary <assessment.json> | classekit select <assessment.json> [--ids=q1,q2] [--exclude-ids=q3,q4] [--ids-only] [--count-only] [--summary-only] [--timed-only|--untimed-only] [--with-difficulty|--without-difficulty] [--tagged-only|--untagged-only] [--tag=tag] [--tags=a,b] [--any-tags=a,b] [--exclude-tags=a,b] [--difficulty=level] [--kind=kind] [--min-points=n] [--max-points=n] [--min-time=n] [--max-time=n] [--order=assessment|points-asc|points-desc|time-asc|time-desc|difficulty-asc|difficulty-desc|kind-asc|kind-desc] [--offset=n] [--limit=n] | classekit score <assessment.json> <answers.json> [--partial-credit] | classekit recommend <assessment.json> <answers.json> [--threshold=70] | classekit shuffle <assessment.json> [--seed=42] | classekit stats <result-1.json> <result-2.json> ... | classekit export-json <assessment.json> | classekit export-csv <assessment.json> | classekit export-md <assessment.json> [--answers] [--locale=fr|en] | classekit export-html <assessment.json> [--answers] [--locale=fr|en]");
  process.exitCode = 2;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

if (!command || !assessmentPath || !["validate", "validate-score", "summary", "select", "score", "recommend", "shuffle", "stats", "export-json", "export-csv", "export-md", "export-html"].includes(command)) {
  usage();
} else {
  try {
    if (command === "validate-score") {
      const issues = validateScoreResult(await readJson(assessmentPath));
      console.log(JSON.stringify({ valid: issues.length === 0, issues }, null, 2));
      if (issues.length > 0) process.exitCode = 1;
    } else if (command === "stats") {
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
      } else if (command === "summary") {
      console.log(JSON.stringify(summarizeAssessment(assessment), null, 2));
      } else if (command === "select") {
        if ([idsOnly, countOnly, summaryOnly].filter(Boolean).length > 1) {
          throw new Error("Selection output modes are mutually exclusive");
        }
        if (timedOnly && untimedOnly) throw new Error("Timed selection modes are mutually exclusive");
        if (difficultyOnly && withoutDifficulty) throw new Error("Difficulty selection modes are mutually exclusive");
        if (taggedOnly && untaggedOnly) throw new Error("Tag selection modes are mutually exclusive");
        const tags = tagsArgument?.slice("--tags=".length).split(",").map((tag) => tag.trim()).filter(Boolean);
        const anyTags = anyTagsArgument?.slice("--any-tags=".length).split(",").map((tag) => tag.trim());
        const excludeTags = excludeTagsArgument?.slice("--exclude-tags=".length).split(",").map((tag) => tag.trim());
        const ids = idsArgument?.slice("--ids=".length).split(",").map((id) => id.trim());
        const excludeIds = excludeIdsArgument?.slice("--exclude-ids=".length).split(",").map((id) => id.trim());
        const selected = selectQuestions(assessment, {
          ...(ids ? { ids } : {}),
          ...(excludeIds ? { excludeIds } : {}),
          ...(tagArgument ? { tag: tagArgument.slice("--tag=".length) } : {}),
          ...(tags?.length ? { tags } : {}),
          ...(anyTags ? { anyTags } : {}),
          ...(excludeTags ? { excludeTags } : {}),
          ...((timedOnly || untimedOnly) ? { hasEstimatedTime: timedOnly } : {}),
          ...((difficultyOnly || withoutDifficulty) ? { hasDifficulty: difficultyOnly } : {}),
          ...((taggedOnly || untaggedOnly) ? { hasTags: taggedOnly } : {}),
          ...(difficultyArgument ? { difficulty: difficultyArgument.slice("--difficulty=".length) } : {}),
          ...(kindArgument ? { kind: kindArgument.slice("--kind=".length) } : {}),
          ...(minPointsArgument ? { minPoints: Number(minPointsArgument.slice("--min-points=".length)) } : {}),
          ...(maxPointsArgument ? { maxPoints: Number(maxPointsArgument.slice("--max-points=".length)) } : {}),
          ...(offsetArgument ? { offset: Number(offsetArgument.slice("--offset=".length)) } : {}),
          ...(limitArgument ? { limit: Number(limitArgument.slice("--limit=".length)) } : {}),
          ...(orderArgument ? { order: orderArgument.slice("--order=".length) } : {}),
          ...(minTimeArgument ? { minEstimatedSeconds: Number(minTimeArgument.slice("--min-time=".length)) } : {}),
          ...(maxTimeArgument ? { maxEstimatedSeconds: Number(maxTimeArgument.slice("--max-time=".length)) } : {}),
          ...(seedArgument ? { seed } : {}),
        });
        console.log(JSON.stringify(summaryOnly ? summarizeQuestionSelection(selected) : countOnly ? selected.length : idsOnly ? selected.map((question) => question.id) : selected, null, 2));
      } else if (command === "export-json") {
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
