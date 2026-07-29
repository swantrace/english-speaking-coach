import { describe, expect, test } from "bun:test";
import { buildInConversationAnalysisPrompt } from "@english-coach/prompts";
import { normalizeInConversationAnalysisOutput } from "./session";

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
