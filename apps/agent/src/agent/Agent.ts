import {
  inConversationAnalysisJobName,
  inConversationAnalysisJobSchema,
  sessionCompletionJobName,
  workerFeedbackPacketSchema,
} from "@english-coach/contract/session";
import { llm, voice } from "@livekit/agents";
import { z } from "zod";

import { logAgentValidationError } from "./error-log";
import { createFreeFormInstructions, withLatestWorkerFeedback } from "./free-form";
import { createRolePlayInstructions, SessionTracker } from "./role-play";
import {
  analysisTurnThreshold,
  inConversationAnalysisQueue,
  preserveAgentToolCall,
  sessionCompletionQueue,
} from "./runtime-services";
import { toSessionTurns } from "./session-turns";
import type { AgentRuntimeConfig, FreeFormRuntimeConfig, RolePlayRuntimeConfig } from "./types";

function serializeToolError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}

export class Agent extends voice.Agent {
  private readonly rolePlayConfig: RolePlayRuntimeConfig | null;
  private readonly sessionTracker: SessionTracker | null;

  constructor(private readonly config: AgentRuntimeConfig) {
    const sessionTracker = config.sessionType === "role-play" ? new SessionTracker(config.scenario) : null;
    let refreshInstructions: (() => Promise<void>) | null = null;

    const tools =
      config.sessionType === "role-play" && sessionTracker
        ? {
            recordGoalEvidence: llm.tool({
              description:
                "Immediately call this once before replying whenever the learner's latest turn provides evidence for any active or upcoming role-play goal. Submit one item per matching goal, with all matching required intents and available required slots. Preserve evidence for upcoming goals instead of waiting for them to become active. Use only the exact goal IDs, intent names, and slot names in the instructions.",
              parameters: z.object({
                goalEvidence: z
                  .array(
                    z.object({
                      goalId: z.string().trim().min(1),
                      intents: z.array(z.string().trim().min(1)).default([]),
                      slots: z.record(z.string(), z.string()).default({}),
                    }),
                  )
                  .min(1),
              }),
              execute: async ({ goalEvidence }, toolContext) => {
                const startedAt = new Date().toISOString();
                const startedAtMs = Date.now();
                const toolInput = { goalEvidence };

                try {
                  sessionTracker.recordEvidence(goalEvidence);
                  await config.publishGoalProgress(sessionTracker.toGoalProgressPacket(this.getLatestUserTurnIndex()));

                  if (refreshInstructions) {
                    await refreshInstructions();
                  }

                  const output = sessionTracker.createHint();

                  try {
                    await preserveAgentToolCall({
                      completedAt: new Date().toISOString(),
                      input: toolInput,
                      latencyMs: Date.now() - startedAtMs,
                      metadata: {
                        sessionType: config.sessionType,
                      },
                      output,
                      sessionHistoryId: config.sessionHistoryId,
                      startedAt,
                      status: "completed",
                      toolCallId: toolContext?.toolCallId,
                      toolName: "recordGoalEvidence",
                    });
                  } catch (logError) {
                    logAgentValidationError(
                      {
                        handler: "recordGoalEvidence.preserveToolCall",
                        sessionHistoryId: config.sessionHistoryId,
                      },
                      logError,
                    );
                  }

                  return output;
                } catch (error) {
                  try {
                    await preserveAgentToolCall({
                      completedAt: new Date().toISOString(),
                      error: serializeToolError(error),
                      input: toolInput,
                      latencyMs: Date.now() - startedAtMs,
                      metadata: {
                        sessionType: config.sessionType,
                      },
                      sessionHistoryId: config.sessionHistoryId,
                      startedAt,
                      status: "failed",
                      toolCallId: toolContext?.toolCallId,
                      toolName: "recordGoalEvidence",
                    });
                  } catch (logError) {
                    logAgentValidationError(
                      {
                        handler: "recordGoalEvidence.preserveFailedToolCall",
                        sessionHistoryId: config.sessionHistoryId,
                      },
                      logError,
                    );
                  }

                  throw error;
                }
              },
            }),
          }
        : undefined;

    const agentOptions = {
      instructions:
        config.sessionType === "role-play" && sessionTracker
          ? createRolePlayInstructions(config, sessionTracker)
          : createFreeFormInstructions(config as FreeFormRuntimeConfig),
    } as ConstructorParameters<typeof voice.Agent>[0];

    if (tools) {
      agentOptions.tools = tools;
    }

    super(agentOptions);

    this.rolePlayConfig = config.sessionType === "role-play" ? config : null;
    this.sessionTracker = sessionTracker;
    refreshInstructions = () => this.refreshRolePlayInstructions();
  }

  get sessionType() {
    return this.config.sessionType;
  }

  readonly roomDataReceivedHandler = async (
    payload: Uint8Array,
    _participant: unknown,
    _kind: unknown,
    topic?: string,
  ) => {
    if (this.config.sessionType !== "free-form" || topic !== "worker-feedback") {
      return;
    }

    let parsedPayload: ReturnType<typeof workerFeedbackPacketSchema.safeParse>;

    try {
      parsedPayload = workerFeedbackPacketSchema.safeParse(JSON.parse(new TextDecoder().decode(payload)));
    } catch (error) {
      logAgentValidationError(
        {
          handler: "roomDataReceivedHandler",
          sessionHistoryId: this.config.sessionHistoryId,
          topic,
        },
        error,
      );
      return;
    }

    if (!parsedPayload.success) {
      logAgentValidationError(
        {
          handler: "roomDataReceivedHandler",
          sessionHistoryId: this.config.sessionHistoryId,
          topic,
        },
        parsedPayload.error,
      );
      return;
    }

    if (parsedPayload.data.sessionHistoryId !== this.config.sessionHistoryId) {
      return;
    }

    await this.appendWorkerFeedback(parsedPayload.data);
  };

  async analyzeTurns(lastAnalysisTurnIndex: number) {
    if (this.config.sessionType !== "free-form") {
      return lastAnalysisTurnIndex;
    }

    const turns = toSessionTurns(this.chatCtx);
    const pendingTurns = turns.slice(lastAnalysisTurnIndex);

    if (pendingTurns.length === 0) {
      return lastAnalysisTurnIndex;
    }

    const userTurnCount = pendingTurns.filter((turn) => turn.speaker === "user").length;
    const lastTurn = pendingTurns.at(-1);

    if (userTurnCount < analysisTurnThreshold || lastTurn?.speaker !== "assistant") {
      return lastAnalysisTurnIndex;
    }

    const parsedJob = inConversationAnalysisJobSchema.safeParse({
      roomName: this.config.roomName,
      sessionHistoryId: this.config.sessionHistoryId,
      transcriptStartIndex: lastAnalysisTurnIndex,
      turns: pendingTurns,
    });

    if (!parsedJob.success) {
      logAgentValidationError(
        {
          handler: "analyzeTurns",
          lastAnalysisTurnIndex,
          roomName: this.config.roomName,
          sessionHistoryId: this.config.sessionHistoryId,
        },
        parsedJob.error,
      );
      return lastAnalysisTurnIndex;
    }

    await inConversationAnalysisQueue.add(inConversationAnalysisJobName, parsedJob.data, {
      jobId: `${inConversationAnalysisJobName}-${this.config.sessionHistoryId}-${lastAnalysisTurnIndex}`,
      removeOnComplete: true,
      removeOnFail: false,
    });

    return turns.length;
  }

  async analyzeSession(lastAnalysisTurnIndex: number) {
    const turns = toSessionTurns(this.chatCtx);
    const transcript = this.config.sessionType === "free-form" ? turns.slice(lastAnalysisTurnIndex) : turns;

    await sessionCompletionQueue.add(
      sessionCompletionJobName,
      {
        completedGoals: this.getCompletedGoalIds(),
        roomName: this.config.roomName,
        sessionHistoryId: this.config.sessionHistoryId,
        transcript,
      },
      {
        jobId: `${sessionCompletionJobName}-${this.config.sessionHistoryId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async publishInitialGoalProgress() {
    if (!this.rolePlayConfig || !this.sessionTracker) {
      return;
    }

    await this.rolePlayConfig.publishGoalProgress(this.sessionTracker.toGoalProgressPacket());
  }

  getCompletedGoalIds() {
    return this.sessionTracker?.getCompletedGoalIds() ?? [];
  }

  private async refreshRolePlayInstructions() {
    if (!this.rolePlayConfig || !this.sessionTracker) {
      return;
    }

    this._instructions = createRolePlayInstructions(this.rolePlayConfig, this.sessionTracker);
    await this.updateChatCtx(this.chatCtx.copy());
  }

  async appendWorkerFeedback(payload: unknown) {
    if (this.config.sessionType !== "free-form") {
      return;
    }

    const parsedPacket = workerFeedbackPacketSchema.safeParse(payload);

    if (!parsedPacket.success) {
      logAgentValidationError(
        {
          handler: "appendWorkerFeedback",
          sessionHistoryId: this.config.sessionHistoryId,
        },
        parsedPacket.error,
      );
      return;
    }

    const packet = parsedPacket.data;
    const nextChatContext = withLatestWorkerFeedback(this.chatCtx.copy(), packet.message);

    await this.updateChatCtx(nextChatContext);
  }

  private getLatestUserTurnIndex() {
    const turns = toSessionTurns(this.chatCtx);

    for (let index = turns.length - 1; index >= 0; index -= 1) {
      if (turns[index]?.speaker === "user") {
        return index;
      }
    }

    return undefined;
  }
}
