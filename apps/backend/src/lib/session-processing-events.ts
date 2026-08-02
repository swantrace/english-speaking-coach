import { createSessionProcessingEvent } from "@english-coach/contract/session";
import type { sessionProcessing } from "@english-coach/database/schema";
import { pubsubPublisherRedis } from "./redis";
import { getSessionProcessing, transitionSessionProcessingStage } from "./session-processing";
import { getSessionProcessingChannel } from "./session-processing-channel";

type SessionProcessingRecord = typeof sessionProcessing.$inferSelect;

export async function publishSessionProcessingRecord(processing: SessionProcessingRecord) {
  const event = createSessionProcessingEvent(processing);
  await pubsubPublisherRedis.publish(getSessionProcessingChannel(processing.sessionHistoryId), JSON.stringify(event));
  return event;
}

export async function publishCurrentSessionProcessing(sessionHistoryId: string) {
  const processing = await getSessionProcessing(sessionHistoryId);

  if (!processing) {
    return null;
  }

  return publishSessionProcessingRecord(processing);
}

export async function transitionAndPublishSessionProcessingStage({
  error,
  sessionHistoryId,
  stage,
  status,
}: Parameters<typeof transitionSessionProcessingStage>[0]) {
  const processing = await transitionSessionProcessingStage({
    error,
    sessionHistoryId,
    stage,
    status,
  });
  await publishSessionProcessingRecord(processing);
  return processing;
}
