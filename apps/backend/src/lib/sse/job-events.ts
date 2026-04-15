import {
  type JobProgressMessage,
  jobEventsConnectedEvent,
  jobEventsHeartbeatEvent,
  jobEventsSystemMessageSchema,
} from "@english-coach/contract/common";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

import { createSubscriberRedisConnection } from "../redis";

interface StreamChannelJobProgressOptions<TMessage extends JobProgressMessage> {
  channel: string;
  eventName: string;
  getMessageId?: (message: TMessage) => string;
  getInitialMessages?: () => Promise<TMessage[]>;
  maxDurationMs?: number;
  shouldIncludeMessage?: (message: TMessage) => boolean;
  subscriberName: string;
}

export function streamChannelJobProgressSSE<TMessage extends JobProgressMessage>(
  context: Context,
  options: StreamChannelJobProgressOptions<TMessage>,
) {
  const subscriber = createSubscriberRedisConnection(options.subscriberName);
  const startedAt = Date.now();

  return streamSSE(context, async (stream) => {
    let closed = false;

    const closeStream = async () => {
      if (closed) {
        return;
      }

      closed = true;
      subscriber.disconnect();
      stream.close();
    };

    await subscriber.subscribe(options.channel);

    if (options.getInitialMessages) {
      const initialMessages = await options.getInitialMessages();

      for (const message of initialMessages) {
        if (options.shouldIncludeMessage && !options.shouldIncludeMessage(message)) {
          continue;
        }

        await stream.writeSSE({
          data: JSON.stringify(message),
          event: options.eventName,
          id: options.getMessageId ? options.getMessageId(message) : message.jobId,
        });
      }
    }

    stream.onAbort(async () => {
      await closeStream();
    });

    subscriber.on("message", async (_channel: string, rawMessage: string) => {
      if (closed) {
        return;
      }

      let message: TMessage;

      try {
        message = JSON.parse(rawMessage) as TMessage;
      } catch {
        return;
      }

      if (options.shouldIncludeMessage && !options.shouldIncludeMessage(message)) {
        return;
      }

      await stream.writeSSE({
        data: JSON.stringify(message),
        event: options.eventName,
        id: options.getMessageId ? options.getMessageId(message) : message.jobId,
      });
    });

    await stream.writeSSE({
      data: JSON.stringify(
        jobEventsSystemMessageSchema.parse({ channel: options.channel, status: jobEventsConnectedEvent }),
      ),
      event: jobEventsConnectedEvent,
    });

    while (!closed) {
      const elapsedMs = Date.now() - startedAt;

      if (typeof options.maxDurationMs === "number" && elapsedMs >= options.maxDurationMs) {
        await closeStream();
        break;
      }

      const heartbeatIntervalMs = 15000;
      const sleepDurationMs =
        typeof options.maxDurationMs === "number"
          ? Math.min(heartbeatIntervalMs, Math.max(options.maxDurationMs - elapsedMs, 0))
          : heartbeatIntervalMs;

      if (sleepDurationMs <= 0) {
        await closeStream();
        break;
      }

      await stream.sleep(sleepDurationMs);

      if (closed) {
        break;
      }

      await stream.writeSSE({
        data: JSON.stringify(
          jobEventsSystemMessageSchema.parse({ channel: options.channel, status: jobEventsHeartbeatEvent }),
        ),
        event: jobEventsHeartbeatEvent,
      });
    }
  });
}
