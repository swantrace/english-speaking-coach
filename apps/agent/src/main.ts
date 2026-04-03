import { fileURLToPath } from "node:url";
import {
  type GoalProgressPacket,
  inConversationAnalysisJobName,
  inConversationAnalysisJobSchema,
  inConversationAnalysisQueueName,
  type Scenario,
  type SessionTurn,
  sessionCompletionRequestSchema,
  sessionDispatchMetadataSchema,
  workerFeedbackPacketSchema,
} from "@english-coach/contract";
import { cli, defineAgent, inference, type JobContext, type JobProcess, ServerOptions, voice } from "@livekit/agents";
import * as livekit from "@livekit/agents-plugin-livekit";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";
import { Queue } from "bullmq";

import { Agent } from "./agent";
import {
  getBackendBaseUrl,
  getRequiredEnv,
  loadAgentEnv,
  resolveAgentModelProvider,
  validateAgentEnvironment,
} from "./env";

loadAgentEnv();
validateAgentEnvironment();

const agentModelProvider = resolveAgentModelProvider();
const useLiveKitInference = agentModelProvider === "livekit";

const inConversationAnalysisQueue = new Queue(inConversationAnalysisQueueName, {
  connection: {
    db: Number(process.env.REDIS_DB ?? 0),
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    password: process.env.REDIS_PASSWORD,
    port: Number(process.env.REDIS_PORT ?? 6379),
    username: process.env.REDIS_USERNAME,
  },
});

function getAgentApiHeaders() {
  return {
    Authorization: `Bearer ${getRequiredEnv("API_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

async function fetchScenarioFromBackend(scenarioId: string) {
  const response = await fetch(`${getBackendBaseUrl()}/api/internal/agent/scenarios/${scenarioId}`, {
    headers: getAgentApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch scenario ${scenarioId}: ${response.status}`);
  }

  return (await response.json()) as Scenario;
}

async function finalizeSession(params: {
  completedGoals: string[];
  roomName: string;
  sessionHistoryId: string;
  transcript: SessionTurn[];
}) {
  const payload = sessionCompletionRequestSchema.parse(params);
  const response = await fetch(`${getBackendBaseUrl()}/api/internal/agent/session-complete`, {
    body: JSON.stringify(payload),
    headers: getAgentApiHeaders(),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to finalize session ${params.sessionHistoryId}: ${response.status}`);
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    const vad = ctx.proc.userData.vad as silero.VAD | undefined;

    if (!vad) {
      throw new Error("Silero VAD was not loaded during prewarm.");
    }

    const rawDispatchMetadata = (ctx.job as { agentDispatch?: { metadata?: string } }).agentDispatch?.metadata;

    if (!rawDispatchMetadata) {
      throw new Error("Agent dispatch metadata is missing.");
    }

    const sessionMetadata = sessionDispatchMetadataSchema.parse(JSON.parse(rawDispatchMetadata));
    const scenario =
      sessionMetadata.sessionType === "role-play"
        ? await fetchScenarioFromBackend(sessionMetadata.scenarioId)
        : undefined;
    const transcript: SessionTurn[] = [];
    let finalized = false;
    let turnsSinceLastAnalysis = 0;
    let pendingAnalysisAfterAssistantReply = false;
    let lastAnalysisTurnIndex = 0;

    await ctx.connect();

    const agent =
      sessionMetadata.sessionType === "role-play" && scenario
        ? new Agent({
            ...sessionMetadata,
            publishGoalProgress: async (packet: GoalProgressPacket) => {
              const localParticipant = ctx.room.localParticipant;

              if (!localParticipant) {
                throw new Error("Local participant is unavailable for room data publishing.");
              }

              await localParticipant.publishData(new TextEncoder().encode(JSON.stringify(packet)), {
                reliable: true,
                topic: packet.type,
              });
            },
            scenario,
          })
        : sessionMetadata.sessionType === "free-form"
          ? new Agent(sessionMetadata)
          : (() => {
              throw new Error("Role-play sessions require a fetched scenario before agent startup.");
            })();

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

    const finalize = async () => {
      if (finalized) {
        return;
      }

      finalized = true;

      await finalizeSession({
        completedGoals: agent.getCompletedGoalIds(),
        roomName: sessionMetadata.roomName,
        sessionHistoryId: sessionMetadata.sessionHistoryId,
        transcript,
      });
    };

    ctx.addShutdownCallback(finalize);

    ctx.room.on("dataReceived", async (payload, _participant, _kind, topic) => {
      if (sessionMetadata.sessionType !== "free-form" || topic !== "worker-feedback") {
        return;
      }

      const parsedPayload = workerFeedbackPacketSchema.safeParse(JSON.parse(new TextDecoder().decode(payload)));

      if (!parsedPayload.success || parsedPayload.data.sessionHistoryId !== sessionMetadata.sessionHistoryId) {
        return;
      }

      await agent.appendWorkerFeedback(parsedPayload.data);
    });

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, async (event) => {
      const item = event.item;

      if (item.type !== "message") {
        return;
      }

      const text = item.textContent?.trim();

      if (!text || (item.role !== "user" && item.role !== "assistant")) {
        return;
      }

      transcript.push({
        speaker: item.role === "assistant" ? "agent" : "user",
        text,
        timestampMs: item.createdAt,
      });

      if (sessionMetadata.sessionType !== "free-form") {
        return;
      }

      if (item.role === "user") {
        turnsSinceLastAnalysis += 1;

        if (turnsSinceLastAnalysis >= Number(process.env.IN_CONVERSATION_ANALYSIS_TURN_COUNT ?? 4)) {
          pendingAnalysisAfterAssistantReply = true;
        }

        return;
      }

      if (!pendingAnalysisAfterAssistantReply) {
        return;
      }

      pendingAnalysisAfterAssistantReply = false;
      turnsSinceLastAnalysis = 0;
      const turns = transcript.slice(lastAnalysisTurnIndex);
      lastAnalysisTurnIndex = transcript.length;

      if (turns.length === 0) {
        return;
      }

      await inConversationAnalysisQueue.add(
        inConversationAnalysisJobName,
        inConversationAnalysisJobSchema.parse({
          roomName: sessionMetadata.roomName,
          sessionHistoryId: sessionMetadata.sessionHistoryId,
          turns,
        }),
        {
          removeOnComplete: true,
        },
      );
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

    await agent.publishInitialGoalProgress();

    session.generateReply({
      instructions:
        sessionMetadata.sessionType === "role-play"
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
