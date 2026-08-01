import { describe, expect, it } from "bun:test";
import {
  adminApproveKnowledgeOccurrenceSchema,
  knowledgeOccurrenceDraftSchema,
} from "@english-coach/contract/knowledge";
import { buildKnowledgeItemFromOccurrencePrompt } from "@english-coach/prompts";
import { buildApprovedKnowledgeItemValues } from "../knowledge-occurrence-review";
import {
  buildKnowledgeOccurrenceDraftUpdate,
  createKnowledgeOccurrenceEnrichmentJobs,
} from "../queues/helpers/knowledge-occurrence.enrichment";

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

describe("knowledge occurrence enrichment", () => {
  const generatedDraft = {
    communicativeFunction: "express_attitude_or_opinion" as const,
    fixednessLevel: null,
    pattern: "I am worried I might <verb>",
    patternType: "grammatical_adjective_that_clause" as const,
    senses: [
      {
        example: "I am worried I might miss the deadline.",
        example_zh: "我担心我可能会错过截止日期。",
        meaning_en: "Used to express concern about a possible future event.",
        meaning_zh: "用于表达对未来可能发生之事的担忧。",
        order: 1,
      },
    ],
  };

  it("maps AI output only to occurrence draft fields", () => {
    const update = buildKnowledgeOccurrenceDraftUpdate(generatedDraft);

    expect(update).toEqual({
      proposedCommunicativeFunction: "express_attitude_or_opinion",
      proposedFixednessLevel: null,
      proposedPattern: "I am worried I might <verb>",
      proposedPatternType: "grammatical_adjective_that_clause",
      proposedSenses: generatedDraft.senses,
    });
    expect("knowledgeItemId" in update).toBe(false);
    expect("isPendingReview" in update).toBe(false);
  });

  it("creates deterministic retryable jobs and removes duplicate occurrence IDs", () => {
    const jobs = createKnowledgeOccurrenceEnrichmentJobs(["occurrence-1", "occurrence-1", "occurrence-2"]);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      data: { occurrenceId: "occurrence-1" },
      name: "knowledgeOccurrenceEnrich",
      opts: {
        attempts: 3,
        jobId: "knowledgeOccurrenceEnrich-occurrence-1",
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  });

  it("rejects incomplete generated drafts before persistence", () => {
    expect(() =>
      buildKnowledgeOccurrenceDraftUpdate({
        ...generatedDraft,
        senses: [],
      }),
    ).toThrow();
  });
});

describe("knowledge occurrence approval", () => {
  const approvalInput = {
    communicativeFunction: "express_attitude_or_opinion" as const,
    fixednessLevel: null,
    pattern: "I am worried I might <verb>",
    patternType: "grammatical_adjective_that_clause" as const,
    senses: [
      {
        example: "I am worried I might miss the deadline.",
        example_zh: "我担心我可能会错过截止日期。",
        meaning_en: "Used to express concern about a possible future event.",
        meaning_zh: "用于表达对未来可能发生之事的担忧。",
        order: 1,
      },
    ],
  };

  it("requires a complete edited candidate", () => {
    expect(adminApproveKnowledgeOccurrenceSchema.parse(approvalInput)).toEqual(approvalInput);
    expect(
      adminApproveKnowledgeOccurrenceSchema.safeParse({
        ...approvalInput,
        senses: [],
      }).success,
    ).toBe(false);
  });

  it("creates a formal knowledge item without pending-review state", () => {
    const values = buildApprovedKnowledgeItemValues(approvalInput, {
      id: "knowledge-1",
      now: "2026-08-01T00:00:00.000Z",
    });

    expect(values).toMatchObject({
      id: "knowledge-1",
      isPendingReview: false,
      pattern: approvalInput.pattern,
      senses: approvalInput.senses,
    });
  });
});
