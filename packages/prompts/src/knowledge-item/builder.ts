// import { buildJsonOutputConstraints, formatKnowledgeItemTypesAndTags } from "../helper";
// import { type BuildKnowledgeItemGeneratePromptParams, functionalTags, grammarTags, knowledgeItemTypes } from "./schema";

// export function buildKnowledgeItemGeneratePrompt(params: BuildKnowledgeItemGeneratePromptParams) {
//   const { draftPhrase, draftExplanation } = params;

//   const system = `You are an experienced English speaking coach who turns raw learner phrases into reusable knowledge points.
// You organize each phrase with a clear explanation, one example sentence, a type, grammar/function tags, and an approximate CEFR level.
// Be concise and precise.
// You must follow the controlled grammar tag inventory provided in the instructions.`;

//   const { formattedTypes, formattedGrammarTags, formattedFunctionalTags } = formatKnowledgeItemTypesAndTags(
//     knowledgeItemTypes,
//     grammarTags,
//     functionalTags,
//   );

//   const prompt = `[TASK]
// Generate a structured knowledge point from the draft input.

// [INPUTS]
// - Draft phrase: ${draftPhrase}
// - Draft explanation (may be missing or rough): ${draftExplanation || "None"}

// [OUTPUT FIELDS]
// You MUST output a single JSON object with these keys:

// - phrase: string
//   Refine the draft phrase into a concise, natural label (do NOT add quotes).

// - explanation: string
//   A short, learner-friendly explanation of what the phrase means or how it is used.

// - example: string
//   ONE natural example sentence that clearly shows typical usage.
//   Aim roughly at B1 level unless the phrase is obviously easier or harder.

// - type: ${formattedTypes}
//   Classify the knowledge point as one of these types.

// - tags: string[]
//   Use the unified tag system:
//     - "g:..."  for grammar features
//     - "f:..."  for functional uses    (e.g. "f:polite_request", "f:apology", "f:complaint")
//     - "t:..."  for topics / contexts  (e.g. "t:travel", "t:work", "t:daily_life")
//     - "lvl:..." for level tags        (e.g. "lvl:A2", "lvl:B1")

//   VERY IMPORTANT:
//     - If a tag starts with "g:", it MUST be chosen from this controlled list:
//       ${formattedGrammarTags}
//     - Do NOT invent new "g:..." tags outside this list.
//     - If a tag starts with "f:", it MUST be chosen from this controlled list:
//       ${formattedFunctionalTags}
//     - Do NOT invent new "f:..." tags outside this list.
//     - For "t:", "lvl:" tags you may create reasonable new tags as needed.

//   General requirements:
//     - Produce 3-6 tags total.
//     - At least ONE "g:..." OR "f:..." tag is required.
//     - Use lowercase with snake_case for multi-word tags (e.g. "f:polite_request").
//     - No punctuation, no spaces around colons.
//     - No duplicates.

// [CONSTRAINTS]
// ${buildJsonOutputConstraints(["phrase", "explanation", "example", "type", "tags"])}
// - Keep the explanation and example concise; avoid filler or meta-commentary.
// `;

//   return { system, prompt };
// }

export const buildKnowledgeItemGeneratePrompt = () => ({
  system: "You are a helpful assistant for generating knowledge items.",
  prompt: "Generate a knowledge item based on the following input: {input}",
});
