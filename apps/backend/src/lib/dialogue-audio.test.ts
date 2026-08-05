import { describe, expect, it } from "bun:test";
import {
  buildCorrectedDialogueTurns,
  createPcmSilence,
  getPcmDurationMs,
  isPermanentDialogueAudioError,
  wrapPcmS16LeInWav,
} from "./dialogue-audio";

describe("corrected dialogue audio", () => {
  it("replaces only rewritten learner turns", () => {
    expect(
      buildCorrectedDialogueTurns(
        [
          { speaker: "user", text: "I want change room." },
          { speaker: "assistant", text: "Certainly. What is the problem?" },
          { speaker: "user", text: "The room is noisy." },
        ],
        [{ text: "I'd like to change rooms.", transcriptTurnIndex: 0 }],
      ),
    ).toEqual([
      { speaker: "user", text: "I'd like to change rooms.", transcriptTurnIndex: 0 },
      { speaker: "assistant", text: "Certainly. What is the problem?", transcriptTurnIndex: 1 },
      { speaker: "user", text: "The room is noisy.", transcriptTurnIndex: 2 },
    ]);
  });

  it("wraps 24 kHz mono 16-bit PCM in a valid WAV container", () => {
    const pcm = createPcmSilence(1_000);
    const wav = wrapPcmS16LeInWav(pcm);

    expect(getPcmDurationMs(pcm)).toBe(1_000);
    expect(wav.subarray(0, 4).toString()).toBe("RIFF");
    expect(wav.subarray(8, 12).toString()).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(24_000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(pcm.byteLength);
    expect(wav.byteLength).toBe(pcm.byteLength + 44);
  });

  it("does not retry permanent storage and quota failures", () => {
    expect(isPermanentDialogueAudioError({ name: "NoSuchBucket" })).toBe(true);
    expect(isPermanentDialogueAudioError({ error: { error_code: "quota_exceeded" }, status: 402 })).toBe(true);
    expect(isPermanentDialogueAudioError(new Error("temporary network failure"))).toBe(false);
  });
});
