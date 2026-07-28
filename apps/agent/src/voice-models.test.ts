import { describe, expect, it } from "vitest";

import { COACHING_TURN_HANDLING, LIVEKIT_INFERENCE_MODELS, PLUGIN_MODELS, withThinkingDisabled } from "./voice-models";

describe("voice model configuration", () => {
  it("uses provider-prefixed IDs only for LiveKit Inference", () => {
    expect(LIVEKIT_INFERENCE_MODELS).toEqual({
      llm: "deepseek-ai/deepseek-v4-pro",
      stt: "deepgram/flux-general-en",
      tts: "cartesia/sonic-3.5",
    });
    expect(PLUGIN_MODELS).toEqual({
      llm: "deepseek-v4-flash",
      stt: "flux-general-en",
      tts: "sonic-3.5",
    });
  });

  it("forces DeepSeek thinking mode off without dropping other request options", () => {
    expect(withThinkingDisabled({ temperature: 0.4 })).toEqual({
      temperature: 0.4,
      thinking: { type: "disabled" },
    });
  });

  it("uses Flux end-of-turn signals and learner-friendly interruption settings", () => {
    expect(COACHING_TURN_HANDLING.turnDetection).toBe("stt");
    expect(COACHING_TURN_HANDLING.interruption.minWords).toBe(1);
    expect(COACHING_TURN_HANDLING.preemptiveGeneration).toMatchObject({
      enabled: true,
      preemptiveTts: false,
    });
  });
});
