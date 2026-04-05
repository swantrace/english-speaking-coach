import {
  type KnowledgeGenerateJobUpdate,
  type KnowledgeGenerateSubmissionItem,
  type KnowledgeGenerateSubmissionResponse,
  type KnowledgeGenerateSubmissionResult,
  knowledgeGenerateEventsPath,
  knowledgeGenerateJobUpdateSchema,
  knowledgeGenerateSubmissionItemSchema,
  knowledgeGenerateSubmissionResponseSchema,
  knowledgeGenerateSubmitPath,
  knowledgeGenerateUpdatedEvent,
} from "@english-coach/contract/knowledge-generate";
import { useSyncExternalStore } from "react";
import { apiBaseUrl } from "./api-base-url";
import { createJobEventsStore } from "./job-events-store";

export const knowledgeGenerateStore = createJobEventsStore<
  KnowledgeGenerateSubmissionItem,
  KnowledgeGenerateSubmissionResult,
  KnowledgeGenerateJobUpdate
>({
  apiBaseUrl,
  eventName: knowledgeGenerateUpdatedEvent,
  eventsPath: knowledgeGenerateEventsPath,
  mapQueuedResultToJob: (result) => {
    if (result.status !== "queued" || !result.jobId || !result.payload || typeof result.cursor !== "number") {
      return null;
    }

    return {
      cursor: result.cursor,
      jobId: result.jobId,
      message: result.payload.message,
      progress: 0,
      queuedAt: result.payload.queuedAt,
      status: "queued",
      submissionId: result.submissionId ?? "unknown",
    } satisfies KnowledgeGenerateJobUpdate;
  },
  submissionItemSchema: knowledgeGenerateSubmissionItemSchema,
  submissionResponseSchema: knowledgeGenerateSubmissionResponseSchema,
  submitPath: knowledgeGenerateSubmitPath,
  updatedEventSchema: knowledgeGenerateJobUpdateSchema,
});

export function useKnowledgeGenerateStore() {
  return useSyncExternalStore(knowledgeGenerateStore.subscribe, knowledgeGenerateStore.getSnapshot);
}

export type { KnowledgeGenerateSubmissionItem, KnowledgeGenerateSubmissionResponse };
