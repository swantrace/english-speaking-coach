import { fileURLToPath } from "node:url";
import { cli, defineAgent, type JobContext, type JobProcess, ServerOptions, voice } from "@livekit/agents";
import * as silero from "@livekit/agents-plugin-silero";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";

import { prepareAgent } from "./agent";
import { loadAgentEnv, resolveAgentModelProvider, validateAgentEnvironment } from "./env";
import { COACHING_TURN_HANDLING, createVoiceModels } from "./voice-models";

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

    const agent = await prepareAgent(ctx.job.metadata, () => ctx.room.localParticipant);

    let finalized = false;
    let lastAnalysisTurnIndex = 0;
    const voiceModels = createVoiceModels(agentModelProvider);

    const session = new voice.AgentSession({
      ...voiceModels,
      turnHandling: COACHING_TURN_HANDLING,
      vad,
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
