import { describe, expect, it } from "bun:test";
import { knowledgeOccurrenceDraftSchema } from "@english-coach/contract/knowledge";
import { buildKnowledgeItemFromOccurrencePrompt } from "@english-coach/prompts";

describe("knowledgeOccurrenceDraftSchema", () => {
  it("accepts a complete candidate draft before human review", () => {
    const draft = knowledgeOccurrenceDraftSchema.parse({
      proposedCommunicativeFunction: "express_attitude_or_opinion",
      proposedFixednessLevel: null,
      proposedPattern: "I am worried I might <verb>",
      proposedPatternType: "grammatical_adjective_that_clause",
      proposedSenses: [
        {
          example: "I am worried I might miss the deadline.",
          example_zh: "我担心我可能会错过截止日期。",
          grammatical_note: "Follow might with the base form of the verb.",
          meaning_en: "Used to express concern about a possible future event.",
          meaning_zh: "用于表达对未来可能发生之事的担忧。",
          order: 1,
        },
      ],
    });

    expect(draft.proposedSenses).toHaveLength(1);
    expect(draft.proposedFixednessLevel).toBeNull();
  });

  it("rejects an incomplete candidate draft", () => {
    const result = knowledgeOccurrenceDraftSchema.safeParse({
      proposedPattern: "I am worried I might <verb>",
      proposedSenses: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("buildKnowledgeItemFromOccurrencePrompt", () => {
  it("requests a complete unapproved occurrence candidate", () => {
    const { prompt, system } = buildKnowledgeItemFromOccurrencePrompt({
      proposedPattern: "I am worried I might <verb>",
      utterance: "I am worried I might miss it.",
    });

    expect(system).toContain("candidate draft for human review");
    expect(system).toContain("not approved");
    expect(prompt).toContain("Always include fixednessLevel");
    expect(prompt).toContain("Always include communicativeFunction");
    expect(prompt).toContain("Always include at least one learner-facing sense");
    expect(prompt).toContain("[REQUIRED JSON SHAPE]");
    expect(prompt).toContain("Do not include approval state");
    expect(prompt).toContain("Proposed pattern: I am worried I might <verb>");
    expect(prompt).toContain("Utterance evidence: I am worried I might miss it.");
  });
});
