import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

interface RedisChannelSubscriber {
  disconnect(): void;
  on(event: "message", listener: (channel: string, message: string) => void | Promise<void>): unknown;
  subscribe(channel: string): Promise<unknown>;
}

interface RedisChannelSystemEvent {
  createData: () => unknown;
  eventName: string;
}

interface StreamRedisChannelSSEOptions<TMessage> {
  channel: string;
  connectedEvent?: RedisChannelSystemEvent;
  createSubscriber?: () => Promise<RedisChannelSubscriber>;
  eventName: string;
  getInitialMessages?: () => Promise<TMessage[]>;
  getMessageId?: (message: TMessage) => string;
  heartbeatEvent: RedisChannelSystemEvent;
  heartbeatIntervalMs?: number;
  maxDurationMs?: number;
  parseMessage: (rawMessage: string) => TMessage | null;
  retryMs?: number;
  shouldClose?: (message: TMessage) => boolean;
  shouldIncludeMessage?: (message: TMessage) => boolean;
  subscriberName: string;
}

const defaultHeartbeatIntervalMs = 15_000;

async function createDefaultSubscriber(name: string) {
  const { createSubscriberRedisConnection } = await import("../redis");
  return createSubscriberRedisConnection(name);
}

export function streamRedisChannelSSE<TMessage>(context: Context, options: StreamRedisChannelSSEOptions<TMessage>) {
  const startedAt = Date.now();

  return streamSSE(context, async (stream) => {
    const subscriber = options.createSubscriber
      ? await options.createSubscriber()
      : await createDefaultSubscriber(options.subscriberName);
    let closed = false;

    const closeStream = () => {
      if (closed) {
        return;
      }

      closed = true;
      subscriber.disconnect();
      stream.close();
    };

    const writeMessage = async (message: TMessage) => {
      if (closed || (options.shouldIncludeMessage && !options.shouldIncludeMessage(message))) {
        return;
      }

      await stream.writeSSE({
        data: JSON.stringify(message),
        event: options.eventName,
        id: options.getMessageId?.(message),
        retry: options.retryMs,
      });

      if (options.shouldClose?.(message)) {
        closeStream();
      }
    };

    subscriber.on("message", async (_channel, rawMessage) => {
      if (closed) {
        return;
      }

      const message = options.parseMessage(rawMessage);

      if (message) {
        await writeMessage(message);
      }
    });

    stream.onAbort(() => {
      closeStream();
    });

    await subscriber.subscribe(options.channel);

    if (options.getInitialMessages) {
      for (const message of await options.getInitialMessages()) {
        await writeMessage(message);

        if (closed) {
          return;
        }
      }
    }

    if (options.connectedEvent) {
      await stream.writeSSE({
        data: JSON.stringify(options.connectedEvent.createData()),
        event: options.connectedEvent.eventName,
      });
    }

    while (!closed) {
      const elapsedMs = Date.now() - startedAt;

      if (typeof options.maxDurationMs === "number" && elapsedMs >= options.maxDurationMs) {
        closeStream();
        break;
      }

      const heartbeatIntervalMs = options.heartbeatIntervalMs ?? defaultHeartbeatIntervalMs;
      const sleepDurationMs =
        typeof options.maxDurationMs === "number"
          ? Math.min(heartbeatIntervalMs, Math.max(options.maxDurationMs - elapsedMs, 0))
          : heartbeatIntervalMs;

      if (sleepDurationMs <= 0) {
        closeStream();
        break;
      }

      await stream.sleep(sleepDurationMs);

      if (!closed) {
        await stream.writeSSE({
          data: JSON.stringify(options.heartbeatEvent.createData()),
          event: options.heartbeatEvent.eventName,
        });
      }
    }
  });
}
