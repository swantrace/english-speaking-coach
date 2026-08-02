// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SessionProcessingPanel } from "./session-processing-panel";

const baseProcessing = {
  analysisError: null,
  analysisStatus: "processing" as const,
  createdAt: "2026-08-01T00:00:00.000Z",
  dialogueAudioError: null,
  dialogueAudioStatus: "queued" as const,
  knowledgeError: null,
  knowledgeStatus: "queued" as const,
  rewrittenTranscriptError: null,
  rewrittenTranscriptStatus: "ready" as const,
  sessionHistoryId: "session-1",
  updatedAt: "2026-08-01T00:00:01.000Z",
};

afterEach(() => {
  cleanup();
});

describe("SessionProcessingPanel", () => {
  it("shows each role-play result independently", () => {
    render(<SessionProcessingPanel connectionState="open" processing={baseProcessing} />);

    expect(screen.getByText("Language review and errors")).toBeTruthy();
    expect(screen.getByText("Refined role-play transcript")).toBeTruthy();
    expect(screen.getByText("Corrected dialogue audio")).toBeTruthy();
    expect(screen.getByText("Knowledge extraction")).toBeTruthy();
    expect(screen.getByText("New results will appear automatically.")).toBeTruthy();
  });

  it("hides role-play-only stages for free-form sessions", () => {
    render(
      <SessionProcessingPanel
        connectionState="closed"
        processing={{
          ...baseProcessing,
          analysisStatus: "ready",
          dialogueAudioStatus: "not_applicable",
          knowledgeStatus: "ready",
          rewrittenTranscriptStatus: "not_applicable",
        }}
      />,
    );

    expect(screen.queryByText("Refined role-play transcript")).toBeNull();
    expect(screen.queryByText("Corrected dialogue audio")).toBeNull();
    expect(screen.getByText("Processing finished.")).toBeTruthy();
  });
});
