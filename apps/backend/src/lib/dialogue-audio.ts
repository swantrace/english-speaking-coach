import { Cartesia } from "@cartesia/cartesia-js";

export const DIALOGUE_AUDIO_SAMPLE_RATE = 24_000;
export const DIALOGUE_AUDIO_CHANNELS = 1;
export const DIALOGUE_AUDIO_BITS_PER_SAMPLE = 16;
export const DIALOGUE_AUDIO_PAUSE_MS = 280;

export interface DialogueSpeechSynthesizer {
  synthesize(text: string, voiceId: string): Promise<Buffer>;
}

export interface DialogueTranscriptTurn {
  speaker: "assistant" | "user";
  text: string;
}

export interface DialogueRewrittenTurn {
  text: string;
  transcriptTurnIndex: number;
}

export function buildCorrectedDialogueTurns(turns: DialogueTranscriptTurn[], rewrittenTurns: DialogueRewrittenTurn[]) {
  const rewrites = new Map(rewrittenTurns.map((turn) => [turn.transcriptTurnIndex, turn.text]));
  return turns.map((turn, transcriptTurnIndex) => ({
    speaker: turn.speaker,
    text: turn.speaker === "user" ? (rewrites.get(transcriptTurnIndex) ?? turn.text) : turn.text,
    transcriptTurnIndex,
  }));
}

function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for corrected dialogue audio`);
  }
  return value;
}

export function getDialogueAudioVoiceIds() {
  return {
    assistant: requireEnvironment("CARTESIA_DIALOGUE_ASSISTANT_VOICE_ID"),
    user: requireEnvironment("CARTESIA_DIALOGUE_USER_VOICE_ID"),
  };
}

export function createCartesiaDialogueSynthesizer(): DialogueSpeechSynthesizer {
  const client = new Cartesia({ apiKey: requireEnvironment("CARTESIA_API_KEY") });
  const modelId = process.env.CARTESIA_DIALOGUE_MODEL?.trim() || "sonic-3.5";

  return {
    async synthesize(text, voiceId) {
      const response = await client.tts.generate({
        generation_config: { speed: 0.95 },
        language: "en",
        model_id: modelId,
        output_format: {
          container: "raw",
          encoding: "pcm_s16le",
          sample_rate: DIALOGUE_AUDIO_SAMPLE_RATE,
        },
        transcript: text,
        voice: { id: voiceId, mode: "id" },
      });
      return Buffer.from(await response.arrayBuffer());
    },
  };
}

export function createPcmSilence(durationMs: number) {
  const sampleCount = Math.round((DIALOGUE_AUDIO_SAMPLE_RATE * durationMs) / 1_000);
  return Buffer.alloc(sampleCount * (DIALOGUE_AUDIO_BITS_PER_SAMPLE / 8) * DIALOGUE_AUDIO_CHANNELS);
}

export function wrapPcmS16LeInWav(pcm: Buffer) {
  if (pcm.byteLength % 2 !== 0) {
    throw new Error("16-bit PCM data must contain complete samples");
  }

  const header = Buffer.alloc(44);
  const byteRate = DIALOGUE_AUDIO_SAMPLE_RATE * DIALOGUE_AUDIO_CHANNELS * (DIALOGUE_AUDIO_BITS_PER_SAMPLE / 8);
  const blockAlign = DIALOGUE_AUDIO_CHANNELS * (DIALOGUE_AUDIO_BITS_PER_SAMPLE / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.byteLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(DIALOGUE_AUDIO_CHANNELS, 22);
  header.writeUInt32LE(DIALOGUE_AUDIO_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(DIALOGUE_AUDIO_BITS_PER_SAMPLE, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.byteLength, 40);

  return Buffer.concat([header, pcm]);
}

export function getPcmDurationMs(pcm: Buffer) {
  const bytesPerSecond = DIALOGUE_AUDIO_SAMPLE_RATE * DIALOGUE_AUDIO_CHANNELS * (DIALOGUE_AUDIO_BITS_PER_SAMPLE / 8);
  return Math.round((pcm.byteLength / bytesPerSecond) * 1_000);
}
