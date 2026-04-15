import {
  inConversationAnalysisQueueName,
  type SessionCompletionJob,
  sessionAgentBootstrapSchema,
  sessionCompletionQueueName,
} from "@english-coach/contract/session";
import { Queue } from "bullmq";

import { getAgentApiToken, getBackendBaseUrl, getRedisConnectionOptions, getRequiredEnv } from "../env";

export const inConversationAnalysisQueue = new Queue(inConversationAnalysisQueueName, {
  connection: getRedisConnectionOptions(),
});

export const sessionCompletionQueue = new Queue<SessionCompletionJob>(sessionCompletionQueueName, {
  connection: getRedisConnectionOptions(),
});

function getAgentApiHeaders() {
  return {
    Authorization: `Bearer ${getAgentApiToken() ?? getRequiredEnv("API_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

export async function fetchSessionBootstrapFromBackend(sessionHistoryId: string) {
  const response = await fetch(`${getBackendBaseUrl()}/api/internal/agent/sessions/${sessionHistoryId}`, {
    headers: getAgentApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch session bootstrap ${sessionHistoryId}: ${response.status}`);
  }

  return sessionAgentBootstrapSchema.parse(await response.json());
}

export const analysisTurnThreshold = Number(process.env.IN_CONVERSATION_ANALYSIS_TURN_COUNT ?? 4);
