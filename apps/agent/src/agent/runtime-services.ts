import {
  inConversationAnalysisQueueName,
  type SessionCompletionJob,
  sessionAgentBootstrapSchema,
  sessionCompletionQueueName,
  type TranscriptAnnotation,
  transcriptAnnotationUpsertRequestSchema,
} from "@english-coach/contract";
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

export async function persistTranscriptAnnotations(sessionHistoryId: string, annotations: TranscriptAnnotation[]) {
  const payload = transcriptAnnotationUpsertRequestSchema.parse({ annotations });
  const response = await fetch(
    `${getBackendBaseUrl()}/api/internal/agent/sessions/${sessionHistoryId}/transcript-annotations`,
    {
      body: JSON.stringify(payload),
      headers: getAgentApiHeaders(),
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to persist transcript annotations for ${sessionHistoryId}: ${response.status}`);
  }
}

export const analysisTurnThreshold = Number(process.env.IN_CONVERSATION_ANALYSIS_TURN_COUNT ?? 4);
