import type { Job } from "bullmq";

export function logWorkerCompleted(jobName: string, job: Job) {
  console.log(`${jobName} job ${job.id} completed`);
}

export function logWorkerFailed(jobName: string, job: Job | undefined, error: Error) {
  console.error(`${jobName} job ${job?.id ?? "unknown"} failed`, error);
}
