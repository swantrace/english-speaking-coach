import { communicativeFunctions, fixednessLevels } from "@english-coach/contract/common";

type PromptModelParams = {
  modelId?: string;
  providerId?: string;
};

const patternTypeDescriptions = [
  '- lexical_verb_noun: lexical V + N collocation, e.g. "make a decision", "catch a bus"',
  '- lexical_adjective_noun: lexical Adj + N collocation, e.g. "heavy rain", "strong tea"',
  '- lexical_noun_verb: lexical N + V collocation, e.g. "alarm goes off", "bomb explodes"',
  '- lexical_noun_of_noun: lexical N1 + of + N2 expression, e.g. "a piece of cake", "a pack of wolves"',
  '- lexical_adverb_adjective: lexical Adv + Adj collocation, e.g. "deeply concerned"',
  '- lexical_verb_particle: lexical V + particle/adverb expression without a following preposition, e.g. "put off"',
  '- grammatical_preposition_noun: Prep + N expression, e.g. "by accident", "in advance"',
  '- grammatical_preposition_noun_preposition: Prep + N + Prep expression, e.g. "in charge of"',
  '- grammatical_adjective_preposition: Adj + Prep complement pattern, e.g. "afraid of"',
  '- grammatical_adjective_to_infinitive: Adj + to-infinitive pattern, e.g. "easy to use"',
  '- grammatical_adjective_that_clause: Adj + that-clause pattern, e.g. "sure that..."',
  '- grammatical_verb_preposition: V + Prep complement pattern, e.g. "focus on"',
  '- grammatical_verb_to_infinitive: V + to-infinitive pattern, e.g. "decide to go"',
  '- grammatical_verb_that_clause: V + that-clause pattern, e.g. "believe that..."',
  '- grammatical_verb_noun_preposition: V + N + Prep expression, e.g. "take care of"',
  '- grammatical_verb_particle_preposition: V + particle/adverb + Prep expression, e.g. "look forward to"',
  '- grammatical_noun_preposition: N + Prep complement pattern, e.g. "reason for"',
  '- grammatical_noun_to_infinitive: N + to-infinitive pattern, e.g. "time to go"',
  '- grammatical_noun_that_clause: N + that-clause pattern, e.g. "the fact that..."',
  '- grammatical_conjunction_phrase: multiword conjunction phrase, e.g. "now that", "even though"',
  '- grammatical_modal_semi_modal_phrase: modal or semi-modal phrase, e.g. "would rather <v>", "used to <v>", "be going to <v>"',
].join("\n");

const fixednessLevelDescriptions = [
  `- ${fixednessLevels[0]}: a conventional word partnership with some lexical flexibility`,
  `- ${fixednessLevels[1]}: a largely fixed conventional expression`,
  `- ${fixednessLevels[2]}: an idiomatic expression whose meaning is not fully compositional`,
].join("\n");

const communicativeFunctionDescriptions = [
  `- ${communicativeFunctions[0]}: establish, maintain, or close social relationships`,
  `- ${communicativeFunctions[1]}: express an attitude, evaluation, preference, or opinion`,
  `- ${communicativeFunctions[2]}: make or respond to requests, suggestions, invitations, or offers`,
  `- ${communicativeFunctions[3]}: provide, request, confirm, or clarify information`,
  `- ${communicativeFunctions[4]}: connect, structure, introduce, or conclude discourse`,
  `- ${communicativeFunctions[5]}: react naturally to another speaker's contribution`,
  `- ${communicativeFunctions[6]}: intensify, limit, hedge, or soften meaning`,
  `- ${communicativeFunctions[7]}: express time, duration, frequency, or sequence`,
].join("\n");

export const buildKnowledgeItemGeneratePrompt = ({
  input = "{input}",
}: PromptModelParams & { input?: string } = {}) => ({
  system: [
    "You are an English linguistics assistant for an admin review queue.",
    "Your job is to convert rough language input into one reusable coaching knowledge item.",
    "Always provide the required linguistic fields. Use the best-supported classification for short phrases.",
  ].join("\n"),
  prompt: [
    "[TASK]",
    "Generate one structured English knowledge item from the input.",
    "",
    "[GUIDELINES]",
    "- Always include a non-empty pattern.",
    "- Always include exactly one patternType from the allowed values below.",
    "- Always include at least one learner-facing sense with meaning_en, meaning_zh, example, example_zh, and order.",
    "- Keep the pattern concise, reusable, and suitable for learner review.",
    "- Prefer phrase patterns, collocations, sentence frames, or useful expressions over isolated vocabulary.",
    "- Normalize spacing and punctuation, but do not invent meaning that is not implied by the input.",
    "",
    "[ALLOWED patternType VALUES]",
    patternTypeDescriptions,
    "",
    "[INPUT]",
    input,
  ].join("\n\n"),
});

export const buildKnowledgeItemFromOccurrencePrompt = ({
  proposedPattern,
  utterance,
}: PromptModelParams & {
  proposedPattern: string;
  utterance: string;
}) => ({
  system: [
    "You are an English linguistics assistant for an admin review queue.",
    "Your job is to enrich an observed conversation occurrence into a complete candidate draft for human review.",
    "The candidate is not approved and must not be treated as a formal knowledge item yet.",
    "Preserve the evidence and provide every required linguistic field using the best-supported classification.",
  ].join("\n"),
  prompt: [
    "[TASK]",
    "Generate one complete structured English knowledge-item candidate from the occurrence evidence.",
    "",
    "[GUIDELINES]",
    "- Use the proposed pattern as a strong hint.",
    "- Improve normalization if it makes the pattern clearer or more reusable.",
    "- Keep the pattern concise and faithful to the utterance.",
    "- Always include exactly one patternType from the allowed values below.",
    "- Always include fixednessLevel. Use null when none of the allowed fixedness levels applies.",
    "- Always include communicativeFunction. Choose the single best-supported function, or null only when the evidence is genuinely insufficient.",
    "- Always include at least one learner-facing sense with meaning_en, meaning_zh, example, example_zh, and order.",
    "- Use the observed utterance as the first example when it is grammatical and clearly illustrates the sense; otherwise provide a corrected natural example.",
    "- Include grammatical_note only when it adds a useful constraint, register note, or structural explanation.",
    "- Do not include approval state, review state, occurrence IDs, or knowledge-item IDs.",
    "",
    "[ALLOWED patternType VALUES]",
    patternTypeDescriptions,
    "",
    "[ALLOWED fixednessLevel VALUES]",
    fixednessLevelDescriptions,
    "",
    "[ALLOWED communicativeFunction VALUES]",
    communicativeFunctionDescriptions,
    "",
    "[REQUIRED JSON SHAPE]",
    '{ "pattern": "I am worried I might <verb>", "patternType": "grammatical_adjective_that_clause", "fixednessLevel": null, "communicativeFunction": "express_attitude_or_opinion", "senses": [{ "order": 1, "meaning_en": "Used to express concern about a possible future event.", "meaning_zh": "用于表达对未来可能发生之事的担忧。", "example": "I am worried I might miss the deadline.", "example_zh": "我担心我可能会错过截止日期。", "grammatical_note": "Follow might with the base form of the verb." }] }',
    "",
    "[OUTPUT CONSTRAINTS]",
    "- Return one valid JSON object matching the required shape.",
    "- Include every top-level key exactly once, including nullable keys.",
    "- Return only the structured object with no markdown or surrounding prose.",
    "",
    "[INPUT]",
    `Proposed pattern: ${proposedPattern}`,
    `Utterance evidence: ${utterance}`,
  ].join("\n\n"),
});
