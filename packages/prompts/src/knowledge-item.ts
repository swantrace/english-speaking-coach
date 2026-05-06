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
    "Your job is to normalize an observed conversation occurrence into one reusable coaching knowledge item.",
    "Preserve the evidence and always provide the required linguistic fields using the best-supported classification.",
  ].join("\n"),
  prompt: [
    "[TASK]",
    "Generate one structured English knowledge item from the occurrence evidence.",
    "",
    "[GUIDELINES]",
    "- Use the proposed pattern as a strong hint.",
    "- Improve normalization if it makes the pattern clearer or more reusable.",
    "- Keep the pattern concise and faithful to the utterance.",
    "- Always include exactly one patternType from the allowed values below.",
    "- Always include at least one learner-facing sense with meaning_en, meaning_zh, example, example_zh, and order.",
    "",
    "[ALLOWED patternType VALUES]",
    patternTypeDescriptions,
    "",
    "[INPUT]",
    `Proposed pattern: ${proposedPattern}`,
    `Utterance evidence: ${utterance}`,
  ].join("\n\n"),
});
