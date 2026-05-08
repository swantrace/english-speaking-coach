import type { Job } from "bullmq";
import {
  appendBackendWorkerErrorLog,
  formatShortErrorMessage,
  getBackendWorkerErrorLogPath,
} from "../../logging/error-log";

export function logWorkerCompleted(jobName: string, job: Job) {
  console.log(`${jobName} job ${job.id} completed`);
}

export function logWorkerFailed(jobName: string, job: Job | undefined, error: Error) {
  const jobId = job?.id ?? "unknown";

  try {
    appendBackendWorkerErrorLog({
      context: {
        attemptsMade: job?.attemptsMade,
        jobId,
        jobName,
        queueName: job?.queueName,
      },
      error,
    });
    console.error(
      `${jobName} job ${jobId} failed: ${formatShortErrorMessage(error)}. Details written to ${getBackendWorkerErrorLogPath()}`,
    );
  } catch (logError) {
    console.error(`${jobName} job ${jobId} failed: ${formatShortErrorMessage(error)}`);
    console.error("Failed to write worker error log", logError);
  }
}
