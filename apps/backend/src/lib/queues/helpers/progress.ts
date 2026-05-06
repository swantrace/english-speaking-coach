import {
  isTerminalJobProgressStatus,
  type JobProgressMessage,
  type JobProgressStatus,
} from "@english-coach/contract/common";
import type IORedis from "ioredis";

export type JobProgressBaseMessage = Omit<JobProgressMessage, "kind">;
export type { JobProgressMessage, JobProgressStatus };

export function isTerminalJobStatus(status: JobProgressStatus) {
  return isTerminalJobProgressStatus(status);
}

export function publishJobProgress(publisher: IORedis, channel: string, message: JobProgressMessage) {
  return publisher.publish(channel, JSON.stringify(message));
}
