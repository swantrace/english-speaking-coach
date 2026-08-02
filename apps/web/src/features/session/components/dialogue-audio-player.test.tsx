// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DialogueAudioPlayer } from "./dialogue-audio-player";

const accessState = vi.hoisted(() => ({
  value: { data: undefined, isError: false } as { data?: { url: string }; isError: boolean },
}));

vi.mock("@/components/media/use-private-media-access", () => ({
  usePrivateMediaAccess: () => accessState.value,
}));

const processing = {
  analysisError: null,
  analysisStatus: "ready" as const,
  createdAt: "2026-08-01T00:00:00.000Z",
  dialogueAudioAssetId: null,
  dialogueAudioError: null,
  dialogueAudioStatus: "queued" as const,
  knowledgeError: null,
  knowledgeStatus: "ready" as const,
  rewrittenTranscriptError: null,
  rewrittenTranscriptStatus: "ready" as const,
  sessionHistoryId: "session-1",
  updatedAt: "2026-08-01T00:00:01.000Z",
};

afterEach(() => {
  cleanup();
  accessState.value = { data: undefined, isError: false };
});

describe("DialogueAudioPlayer", () => {
  it("shows independent queued and failed states", () => {
    const { rerender } = render(<DialogueAudioPlayer audio={null} processing={processing} />);
    expect(screen.getByText("The corrected conversation is still being prepared.")).toBeTruthy();

    rerender(
      <DialogueAudioPlayer
        audio={null}
        processing={{ ...processing, dialogueAudioError: "TTS unavailable", dialogueAudioStatus: "failed" }}
      />,
    );
    expect(screen.getByText("TTS unavailable")).toBeTruthy();
  });

  it("renders private playback when the signed URL is ready", () => {
    accessState.value = { data: { url: "https://media.example.com/dialogue.wav" }, isError: false };
    const { container } = render(
      <DialogueAudioPlayer
        audio={{ assetId: "asset-1", contentType: "audio/wav", durationMs: 12_000 }}
        processing={{ ...processing, dialogueAudioAssetId: "asset-1", dialogueAudioStatus: "ready" }}
      />,
    );

    expect(container.querySelector("audio")?.getAttribute("src")).toBe("https://media.example.com/dialogue.wav");
    expect(screen.getByText(/Your original recording is not stored/)).toBeTruthy();
  });
});
