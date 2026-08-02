import { describe, expect, test } from "bun:test";
import { buildInConversationAnalysisPrompt, buildLingAnalysisPrompt } from "@english-coach/prompts";
import { normalizeInConversationAnalysisOutput, normalizeLingAnalysisForSessionType } from "./session";

describe("in-conversation structured-output prompt", () => {
  test("explicitly requests JSON for OpenAI-compatible json_object mode", () => {
    const { prompt, system } = buildInConversationAnalysisPrompt({
      indexedTurns: [],
    });

    expect(`${system}\n${prompt}`.toLowerCase()).toContain("json");
    expect(prompt).toContain('"prompt":');
    expect(prompt).toContain("Do not use `text`");
  });
});

describe("normalizeInConversationAnalysisOutput", () => {
  test("preserves output that uses the canonical prompt field", () => {
    expect(
      normalizeInConversationAnalysisOutput({
        uiPrompts: [
          {
            prompt: "Ask the coach how to make that sound more natural.",
            promptKind: "knowledge_hint",
            transcriptTurnIndex: 2,
          },
        ],
        workerFeedbackMessage: "Invite the learner to elaborate.",
      }),
    ).toEqual({
      uiPrompts: [
        {
          prompt: "Ask the coach how to make that sound more natural.",
          promptKind: "knowledge_hint",
          transcriptTurnIndex: 2,
        },
      ],
      workerFeedbackMessage: "Invite the learner to elaborate.",
    });
  });

  test("normalizes DeepSeek text aliases to the canonical prompt field", () => {
    expect(
      normalizeInConversationAnalysisOutput({
        uiPrompts: [
          {
            promptKind: "fluency_hint",
            text: "Try extending your answer with one reason.",
            transcriptTurnIndex: 5,
          },
        ],
        workerFeedbackMessage: "Ask one short follow-up question.",
      }),
    ).toEqual({
      uiPrompts: [
        {
          prompt: "Try extending your answer with one reason.",
          promptKind: "fluency_hint",
          transcriptTurnIndex: 5,
        },
      ],
      workerFeedbackMessage: "Ask one short follow-up question.",
    });
  });

  test("rejects prompts that contain neither prompt nor text", () => {
    expect(() =>
      normalizeInConversationAnalysisOutput({
        uiPrompts: [
          {
            promptKind: "error_hint",
            transcriptTurnIndex: 1,
          },
        ],
        workerFeedbackMessage: "Help the learner self-correct.",
      }),
    ).toThrow();
  });
});

describe("post-session linguistic analysis", () => {
  test("requests rewritten turns only for role-play sessions", () => {
    const rolePlayPrompt = buildLingAnalysisPrompt({
      errorDimensions: ["lexical"],
      sessionType: "role-play",
      turns: [],
    }).prompt;
    const freeFormPrompt = buildLingAnalysisPrompt({
      errorDimensions: ["lexical"],
      sessionType: "free-form",
      turns: [],
    }).prompt;

    expect(rolePlayPrompt).toContain("Rewrite only user turns");
    expect(freeFormPrompt).toContain("Always return rewrittenUserTurns as []");
    expect(freeFormPrompt).toContain("do not rewrite or replace any transcript turn");
  });

  test("defensively removes rewritten turns from free-form model output", () => {
    const analysis = {
      errors: [],
      occurrences: [],
      review: "A useful review.",
      rewrittenUserTurns: [{ text: "A rewritten sentence.", transcriptTurnIndex: 0 }],
    };

    expect(normalizeLingAnalysisForSessionType(analysis, "free-form").rewrittenUserTurns).toEqual([]);
    expect(normalizeLingAnalysisForSessionType(analysis, "role-play").rewrittenUserTurns).toEqual(
      analysis.rewrittenUserTurns,
    );
  });
});
