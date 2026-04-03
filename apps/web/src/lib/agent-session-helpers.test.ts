import { describe, expect, it } from "vitest";
import { formatAgentStateLabel, getTranscriptEntries } from "./agent-session-helpers";

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
