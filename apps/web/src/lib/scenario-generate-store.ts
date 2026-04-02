import {
  type ScenarioGenerateJobUpdate,
  type ScenarioGenerateSubmissionItem,
  type ScenarioGenerateSubmissionResponse,
  type ScenarioGenerateSubmissionResult,
  scenarioGenerateEventsPath,
  scenarioGenerateJobUpdateSchema,
  scenarioGenerateSubmissionItemSchema,
  scenarioGenerateSubmissionResponseSchema,
  scenarioGenerateSubmitPath,
  scenarioGenerateUpdatedEvent,
} from "@english-coach/contract/scenario-generate";
import { useSyncExternalStore } from "react";
import { createJobEventsStore } from "./job-events-store";

type ScenarioGenerateImportMetaEnv = ImportMetaEnv & {
  readonly VITE_API_BASE_URL?: string;
};

const apiBaseUrl = (import.meta.env as ScenarioGenerateImportMetaEnv).VITE_API_BASE_URL ?? "http://localhost:3001";

export const scenarioGenerateStore = createJobEventsStore<
  ScenarioGenerateSubmissionItem,
  ScenarioGenerateSubmissionResult,
  ScenarioGenerateJobUpdate
>({
  apiBaseUrl,
  eventName: scenarioGenerateUpdatedEvent,
  eventsPath: scenarioGenerateEventsPath,
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
    } satisfies ScenarioGenerateJobUpdate;
  },
  submissionItemSchema: scenarioGenerateSubmissionItemSchema,
  submissionResponseSchema: scenarioGenerateSubmissionResponseSchema,
  submitPath: scenarioGenerateSubmitPath,
  updatedEventSchema: scenarioGenerateJobUpdateSchema,
});

export function useScenarioGenerateStore() {
  return useSyncExternalStore(scenarioGenerateStore.subscribe, scenarioGenerateStore.getSnapshot);
}

export type { ScenarioGenerateSubmissionItem, ScenarioGenerateSubmissionResponse };
