import type { GoalProgressPacket, SessionAgentBootstrap } from "@english-coach/contract";
import type { JobContext, llm } from "@livekit/agents";

export type WorkerFeedbackChatContext = Pick<llm.ChatContext, "items" | "addMessage">;
export type LocalParticipantRef = JobContext["room"]["localParticipant"];
export type LocalParticipantGetter = () => LocalParticipantRef;

export type RolePlayRuntimeConfig = Extract<SessionAgentBootstrap, { sessionType: "role-play" }> & {
  publishGoalProgress: (packet: GoalProgressPacket) => Promise<void>;
};

export type FreeFormRuntimeConfig = Extract<SessionAgentBootstrap, { sessionType: "free-form" }>;

export type AgentRuntimeConfig = RolePlayRuntimeConfig | FreeFormRuntimeConfig;
