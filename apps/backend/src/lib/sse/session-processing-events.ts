import {
  createSessionProcessingEvent,
  isSessionProcessingTerminal,
  sessionProcessingEventName,
  sessionProcessingEventSchema,
} from "@english-coach/contract/session";
import type { Context } from "hono";
import { getSessionProcessing } from "../session-processing";
import { getSessionProcessingChannel } from "../session-processing-channel";
import { streamRedisChannelSSE } from "./redis-channel";

const heartbeatIntervalMs = 15_000;
const defaultMaxDurationMs = 10 * 60 * 1_000;

function getMaxDurationMs() {
  const configured = Number(process.env.SESSION_PROCESSING_SSE_MAX_DURATION_MS ?? defaultMaxDurationMs);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultMaxDurationMs;
}

export function streamSessionProcessingEventsSSE(context: Context, sessionHistoryId: string) {
  return streamRedisChannelSSE(context, {
    channel: getSessionProcessingChannel(sessionHistoryId),
    eventName: sessionProcessingEventName,
    getInitialMessages: async () => {
      const processing = await getSessionProcessing(sessionHistoryId);
      return processing ? [createSessionProcessingEvent(processing)] : [];
    },
    getMessageId: (event) => event.processing.updatedAt,
    heartbeatEvent: {
      createData: () => ({ sessionHistoryId, timestamp: new Date().toISOString() }),
      eventName: "heartbeat",
    },
    heartbeatIntervalMs,
    maxDurationMs: getMaxDurationMs(),
    parseMessage: (rawMessage) => {
      try {
        const parsed = sessionProcessingEventSchema.safeParse(JSON.parse(rawMessage));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    retryMs: 3_000,
    shouldClose: (event) => isSessionProcessingTerminal(event.processing),
    shouldIncludeMessage: (event) => event.processing.sessionHistoryId === sessionHistoryId,
    subscriberName: `session-processing.${sessionHistoryId}`,
  });
}
