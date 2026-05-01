type PromptModelParams = {
  modelId?: string;
  providerId?: string;
};

export const buildKnowledgeItemGeneratePrompt = ({
  input = "{input}",
}: PromptModelParams & { input?: string } = {}) => ({
  system: [
    "You are an English linguistics assistant for an admin review queue.",
    "Your job is to convert rough language input into one reusable coaching knowledge item.",
    "Be conservative: only add linguistic classifications when they are strongly supported.",
  ].join("\n"),
  prompt: [
    "[TASK]",
    "Generate one structured English knowledge item from the input.",
    "",
    "[GUIDELINES]",
    "- Always include a non-empty pattern.",
    "- Keep the pattern concise, reusable, and suitable for learner review.",
    "- Prefer phrase patterns, collocations, sentence frames, or useful expressions over isolated vocabulary.",
    "- Include an example sentence only when it naturally clarifies the pattern.",
    "- Normalize spacing and punctuation, but do not invent meaning that is not implied by the input.",
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
    "Be conservative: preserve the evidence and only classify what is clear.",
  ].join("\n"),
  prompt: [
    "[TASK]",
    "Generate one structured English knowledge item from the occurrence evidence.",
    "",
    "[GUIDELINES]",
    "- Use the proposed pattern as a strong hint.",
    "- Improve normalization if it makes the pattern clearer or more reusable.",
    "- Keep the pattern concise and faithful to the utterance.",
    "- Include optional linguistic classifications only when confident.",
    "",
    "[INPUT]",
    `Proposed pattern: ${proposedPattern}`,
    `Utterance evidence: ${utterance}`,
  ].join("\n\n"),
});
