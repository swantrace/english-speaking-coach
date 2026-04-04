import { describe, expect, it } from "vitest";
import {
  createHistoryTranscriptCueMap,
  createTranscriptCueMap,
  formatAgentStateLabel,
  getTranscriptEntries,
  getTranscriptEntriesFromSessionTurns,
} from "./agent-session-helpers";

describe("getTranscriptEntries", () => {
  it("filters blank messages and preserves speaker metadata", () => {
    const entries = getTranscriptEntries([
      {
        from: { isLocal: true },
        id: "user-1",
        message: "  Hello coach  ",
        timestamp: "2026-01-01T10:00:00.000Z",
      },
      {
        from: { isLocal: false },
        id: "assistant-1",
        message: "   ",
        timestamp: "2026-01-01T10:00:02.000Z",
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "user-1",
      message: "Hello coach",
      speaker: "user",
    });
    expect(entries[0]?.timestamp).toBeInstanceOf(Date);
  });

  it("falls back to generated ids when a message id is missing", () => {
    const entries = getTranscriptEntries([
      {
        from: { isLocal: false },
        message: "Need anything else?",
      },
    ]);

    expect(entries[0]).toMatchObject({
      id: "message-0",
      message: "Need anything else?",
      speaker: "assistant",
      timestamp: null,
    });
  });
});

describe("formatAgentStateLabel", () => {
  it("humanizes session agent states", () => {
    expect(formatAgentStateLabel("pre-connect-buffering")).toBe("pre connect buffering");
    expect(formatAgentStateLabel("role_play_ready")).toBe("role play ready");
  });
});

describe("createTranscriptCueMap", () => {
  it("attaches role-play progress cues to the latest learner turn", () => {
    const entries = getTranscriptEntries([
      { from: { isLocal: true }, id: "user-1", message: "I want a table for two." },
      { from: { isLocal: false }, id: "assistant-1", message: "Certainly." },
      { from: { isLocal: true }, id: "user-2", message: "Could I also get some water?" },
    ]);

    const cueMap = createTranscriptCueMap({
      entries,
      goalProgress: {
        currentGoalId: "goal-2",
        filledSlots: { drink: "water" },
        goals: [
          { description: "Greet the waiter", id: "goal-1", optional: false, status: "complete" as const },
          { description: "Order a drink", id: "goal-2", optional: false, status: "incomplete" as const },
        ],
        transcriptTurnIndex: 0,
        type: "goal-progress",
      },
    });

    expect(cueMap["user-1"]?.map((cue) => cue.text)).toEqual([
      "Completed goal: Greet the waiter",
      "Current goal: Order a drink. Captured drink: water.",
    ]);
  });

  it("distributes free-form coaching cues across recent learner turns", () => {
    const entries = getTranscriptEntries([
      { from: { isLocal: true }, id: "user-1", message: "Yesterday I goed to the store." },
      { from: { isLocal: false }, id: "assistant-1", message: "Tell me more." },
      { from: { isLocal: true }, id: "user-2", message: "I buyed fruit there." },
    ]);

    const cueMap = createTranscriptCueMap({
      entries,
      observations: [
        {
          observation: "Try asking why the past tense changes here.",
          sessionHistoryId: "s-1",
          transcriptTurnIndex: 0,
          type: "ui-update",
        },
        {
          observation: "There is another irregular verb worth noticing in your second sentence.",
          sessionHistoryId: "s-1",
          transcriptTurnIndex: 2,
          type: "ui-update",
        },
      ],
    });

    expect(cueMap["user-1"]?.[0]?.text).toBe("Try asking why the past tense changes here.");
    expect(cueMap["user-2"]?.[0]?.text).toBe("There is another irregular verb worth noticing in your second sentence.");
  });

  it("creates read-only history cues from completed goals and matched errors", () => {
    const entries = getTranscriptEntriesFromSessionTurns([
      { speaker: "user", text: "I goed to the store.", timestampMs: 1_000 },
      { speaker: "agent", text: "What happened there?", timestampMs: 2_000 },
      { speaker: "user", text: "Then I bought fruit.", timestampMs: 3_000 },
    ]);

    const cueMap = createHistoryTranscriptCueMap({
      completedGoals: ["goal-1"],
      entries,
      errors: [
        {
          errorDescription: "Irregular past tense",
          suggestion: "why 'went' fits better than 'goed'",
          utterance: "I goed to the store.",
        },
      ],
      scenarioGoals: [{ description: "Describe where you went", id: "goal-1" }],
    });

    expect(cueMap["turn-0"]?.[0]?.text).toBe("Irregular past tense Ask about: why 'went' fits better than 'goed'");
    expect(cueMap["turn-2"]?.[0]?.text).toBe("Completed goals: Describe where you went");
  });
});
