import { inference, type voice } from "@livekit/agents";
import * as cartesia from "@livekit/agents-plugin-cartesia";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as openai from "@livekit/agents-plugin-openai";

import type { AgentModelProvider } from "./env";
import { getRequiredEnv } from "./env";

export const DEFAULT_CARTESIA_VOICE_ID = "a167e0f3-df7e-4d52-a9c3-f949145efdab";

export const LIVEKIT_INFERENCE_MODELS = {
  llm: "deepseek-ai/deepseek-v4-pro",
  stt: "deepgram/flux-general-en",
  tts: "cartesia/sonic-3.5",
} as const;

export const PLUGIN_MODELS = {
  llm: "deepseek-v4-flash",
  stt: "flux-general-en",
  tts: "sonic-3.5",
} as const;

export const COACHING_TURN_HANDLING = {
  endpointing: {
    maxDelay: 1_500,
    minDelay: 150,
    mode: "fixed",
  },
  interruption: {
    falseInterruptionTimeout: 1_500,
    minDuration: 500,
    minWords: 1,
    mode: "adaptive",
    resumeFalseInterruption: true,
  },
  preemptiveGeneration: {
    enabled: true,
    maxRetries: 2,
    maxSpeechDuration: 15_000,
    preemptiveTts: false,
  },
  turnDetection: "stt",
} as const;

export function withThinkingDisabled(extraKwargs: Record<string, unknown> | undefined) {
  return {
    ...extraKwargs,
    thinking: { type: "disabled" },
  };
}

class NonThinkingDeepSeekLLM extends openai.LLM {
  override chat(args: Parameters<openai.LLM["chat"]>[0]) {
    return super.chat({
      ...args,
      extraKwargs: withThinkingDisabled(args.extraKwargs),
    });
  }
}

function getCartesiaVoice(env: NodeJS.ProcessEnv) {
  return env.CARTESIA_VOICE_ID?.trim() || DEFAULT_CARTESIA_VOICE_ID;
}

type VoiceModelPipeline = Required<Pick<voice.AgentSessionOptions, "llm" | "stt" | "tts">>;

export function createVoiceModels(
  provider: AgentModelProvider,
  env: NodeJS.ProcessEnv = process.env,
): VoiceModelPipeline {
  const voice = getCartesiaVoice(env);

  if (provider === "livekit") {
    return {
      llm: new inference.LLM({
        model: LIVEKIT_INFERENCE_MODELS.llm,
        provider: "baseten",
        modelOptions: {
          max_tokens: 220,
          temperature: 0.4,
        },
      }),
      stt: new inference.STT({
        language: "en",
        model: LIVEKIT_INFERENCE_MODELS.stt,
      }),
      tts: new inference.TTS({
        language: "en",
        model: LIVEKIT_INFERENCE_MODELS.tts,
        modelOptions: {
          speed: 0.95,
          volume: 1,
        },
        voice,
      }),
    };
  }

  return {
    llm: new NonThinkingDeepSeekLLM({
      apiKey: getRequiredEnv("DEEPSEEK_API_KEY", env),
      baseURL: "https://api.deepseek.com/v1",
      maxCompletionTokens: 220,
      model: PLUGIN_MODELS.llm,
      parallelToolCalls: false,
      temperature: 0.4,
    }),
    stt: new deepgram.STTv2({
      apiKey: getRequiredEnv("DEEPGRAM_API_KEY", env),
      eagerEotThreshold: 0.55,
      eotThreshold: 0.75,
      eotTimeoutMs: 3_500,
      model: PLUGIN_MODELS.stt,
    }),
    tts: new cartesia.TTS({
      apiKey: getRequiredEnv("CARTESIA_API_KEY", env),
      language: "en",
      model: PLUGIN_MODELS.tts,
      speed: 0.95,
      voice,
      volume: 1,
      wordTimestamps: true,
    }),
  };
}
