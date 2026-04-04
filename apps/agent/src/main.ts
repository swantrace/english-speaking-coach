import { fileURLToPath } from "node:url";
import { cli, defineAgent, inference, type JobContext, type JobProcess, ServerOptions, voice } from "@livekit/agents";
import * as livekit from "@livekit/agents-plugin-livekit";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";

import { prepareAgent } from "./agent";
import { getRequiredEnv, loadAgentEnv, resolveAgentModelProvider, validateAgentEnvironment } from "./env";

loadAgentEnv();
validateAgentEnvironment();

const agentModelProvider = resolveAgentModelProvider();
const useLiveKitInference = agentModelProvider === "livekit";

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    const vad = ctx.proc.userData.vad as silero.VAD | undefined;

    if (!vad) {
      throw new Error("Silero VAD was not loaded during prewarm.");
    }

    if (!ctx.job.metadata) {
      throw new Error(`Agent dispatch metadata is missing for job ${ctx.job.id}.`);
    }

    const agent = await prepareAgent(ctx.job.metadata, ctx.room.localParticipant);

    let finalized = false;
    let lastAnalysisTurnIndex = 0;

    const session = new voice.AgentSession({
      stt: useLiveKitInference
        ? new inference.STT({
            language: "multi",
            model: "deepgram/nova-3",
          })
        : new openai.STT({
            apiKey: getRequiredEnv("OPENAI_API_KEY"),
            model: "whisper-1",
          }),
      llm: useLiveKitInference
        ? new inference.LLM({
            model: "openai/gpt-4.1-mini",
          })
        : new openai.LLM({
            apiKey: getRequiredEnv("OPENAI_API_KEY"),
            model: "gpt-4.1-mini",
          }),
      tts: useLiveKitInference
        ? new inference.TTS({
            model: "cartesia/sonic-3",
            voice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
          })
        : new openai.TTS({
            apiKey: getRequiredEnv("OPENAI_API_KEY"),
            model: "tts-1",
          }),
      turnDetection: new livekit.turnDetector.MultilingualModel(),
      vad,
      voiceOptions: {
        preemptiveGeneration: true,
      },
    });

    ctx.addShutdownCallback(async () => {
      if (!finalized) {
        finalized = true;
        await agent.analyzeSession(lastAnalysisTurnIndex);
      }
    });

    ctx.room.on("dataReceived", agent.roomDataReceivedHandler);

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, async (event) => {
      const item = event.item;

      if (item.type !== "message") {
        return;
      }

      lastAnalysisTurnIndex = await agent.analyzeTurns(lastAnalysisTurnIndex);
    });

    await session.start({
      agent,
      inputOptions: useLiveKitInference
        ? {
            noiseCancellation: BackgroundVoiceCancellation(),
          }
        : {},
      room: ctx.room,
    });

    await ctx.connect();

    await agent.publishInitialGoalProgress();

    session.generateReply({
      instructions:
        agent.sessionType === "role-play"
          ? "Open the role-play in character, reference the scenario naturally, and invite the learner to begin."
          : "Greet the learner warmly and invite them to start practicing with the supplied context.",
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "english-speaking-coach-agent",
  }),
);
