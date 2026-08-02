import {
  createSessionProcessingEvent,
  isSessionProcessingTerminal,
  sessionProcessingEventName,
  sessionProcessingEventSchema,
} from "@english-coach/contract/session";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { getSessionProcessing } from "../session-processing";
import { getSessionProcessingChannel } from "../session-processing-channel";

const heartbeatIntervalMs = 15_000;
const defaultMaxDurationMs = 10 * 60 * 1_000;

function getMaxDurationMs() {
  const configured = Number(process.env.SESSION_PROCESSING_SSE_MAX_DURATION_MS ?? defaultMaxDurationMs);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultMaxDurationMs;
}

export function streamSessionProcessingEventsSSE(context: Context, sessionHistoryId: string) {
  const startedAt = Date.now();

  return streamSSE(context, async (stream) => {
    const { createSubscriberRedisConnection } = await import("../redis");
    const subscriber = createSubscriberRedisConnection(`session-processing.${sessionHistoryId}`);
    let closed = false;

    const closeStream = () => {
      if (closed) {
        return;
      }

      closed = true;
      subscriber.disconnect();
      stream.close();
    };

    const writeProcessingEvent = async (rawEvent: unknown) => {
      const parsedEvent = sessionProcessingEventSchema.safeParse(rawEvent);

      if (!parsedEvent.success || parsedEvent.data.processing.sessionHistoryId !== sessionHistoryId) {
        return;
      }

      await stream.writeSSE({
        data: JSON.stringify(parsedEvent.data),
        event: sessionProcessingEventName,
        id: parsedEvent.data.processing.updatedAt,
        retry: 3_000,
      });

      if (isSessionProcessingTerminal(parsedEvent.data.processing)) {
        closeStream();
      }
    };

    subscriber.on("message", async (_channel: string, rawMessage: string) => {
      if (closed) {
        return;
      }

      try {
        await writeProcessingEvent(JSON.parse(rawMessage));
      } catch {
        // Ignore malformed or stale Pub/Sub messages; the database snapshot is authoritative.
      }
    });

    stream.onAbort(() => {
      closeStream();
    });

    await subscriber.subscribe(getSessionProcessingChannel(sessionHistoryId));

    const initialProcessing = await getSessionProcessing(sessionHistoryId);

    if (initialProcessing) {
      await writeProcessingEvent(createSessionProcessingEvent(initialProcessing));
    }

    while (!closed) {
      const remainingMs = getMaxDurationMs() - (Date.now() - startedAt);

      if (remainingMs <= 0) {
        closeStream();
        break;
      }

      await stream.sleep(Math.min(heartbeatIntervalMs, remainingMs));

      if (closed) {
        break;
      }

      await stream.writeSSE({
        data: JSON.stringify({ sessionHistoryId, timestamp: new Date().toISOString() }),
        event: "heartbeat",
      });
    }
  });
}
