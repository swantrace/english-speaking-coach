import { describe, expect, it } from "vitest";
import { parseSessionProcessingEventData } from "./sse";

describe("session processing event stream", () => {
  it("parses a valid processing snapshot", () => {
    const processing = {
      analysisError: null,
      analysisStatus: "ready",
      createdAt: "2026-08-01T00:00:00.000Z",
      dialogueAudioError: null,
      dialogueAudioAssetId: null,
      dialogueAudioStatus: "queued",
      knowledgeError: null,
      knowledgeStatus: "processing",
      rewrittenTranscriptError: null,
      rewrittenTranscriptStatus: "ready",
      sessionHistoryId: "session-1",
      updatedAt: "2026-08-01T00:00:01.000Z",
    };

    expect(parseSessionProcessingEventData(JSON.stringify({ processing, type: "session-processing.updated" }))).toEqual(
      { processing, type: "session-processing.updated" },
    );
  });

  it("ignores malformed and unrelated event payloads", () => {
    expect(parseSessionProcessingEventData("not-json")).toBeNull();
    expect(parseSessionProcessingEventData(JSON.stringify({ type: "heartbeat" }))).toBeNull();
  });
});
