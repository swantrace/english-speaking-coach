import {
  isTerminalJobProgressStatus,
  type JobProgressMessage,
  type JobProgressStatus,
  jobProgressMessageSchema,
} from "@english-coach/contract/common";
import type IORedis from "ioredis";

export type { JobProgressMessage, JobProgressStatus };

export function isTerminalJobStatus(status: JobProgressStatus) {
  return isTerminalJobProgressStatus(status);
}

export function createQueuedProgressMessage(
  jobId: string,
  queuedAt: string,
  message = "Job queued",
): JobProgressMessage {
  return jobProgressMessageSchema.parse({
    jobId,
    message,
    progress: 0,
    queuedAt,
    status: "queued",
  });
}

export function createStartedProgressMessage(
  jobId: string,
  queuedAt: string,
  message = "Job started",
  progress = 10,
): JobProgressMessage {
  return jobProgressMessageSchema.parse({
    jobId,
    message,
    progress,
    queuedAt,
    status: "started",
  });
}

export function createCompletedProgressMessage(
  jobId: string,
  processedAt: string,
  message: string,
): JobProgressMessage {
  return jobProgressMessageSchema.parse({
    jobId,
    message,
    processedAt,
    progress: 100,
    status: "completed",
  });
}

export function createFailedProgressMessage(jobId: string, error: string, message = "Job failed"): JobProgressMessage {
  return jobProgressMessageSchema.parse({
    error,
    jobId,
    message,
    progress: 100,
    status: "failed",
  });
}

export function publishJobProgress(publisher: IORedis, channel: string, message: JobProgressMessage) {
  return publisher.publish(channel, JSON.stringify(message));
}
