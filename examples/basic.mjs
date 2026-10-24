import { createAssessment, scoreAssessment, summarizeAssessment } from "../dist/index.js";

const assessment = createAssessment({
  id: "sciences-cycle-3",
  title: "Les états de l’eau",
  subject: "Sciences",
  questions: [
    {
      id: "q1",
      kind: "single-choice",
      prompt: "À quelle température l’eau gèle-t-elle ?",
      choices: ["0 °C", "50 °C", "100 °C"],
      answer: "0 °C",
      points: 1,
    },
  ],
});

console.log(summarizeAssessment(assessment));
console.log(scoreAssessment(assessment, { q1: "0 °C" }));
