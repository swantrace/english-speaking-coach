import {
  type JobProgressMessage,
  jobEventsConnectedEvent,
  jobEventsHeartbeatEvent,
  jobEventsSystemMessageSchema,
  jobProgressMessageSchema,
} from "@english-coach/contract/common";
import type { Context } from "hono";
import { streamRedisChannelSSE } from "./redis-channel";

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
  return streamRedisChannelSSE<TMessage>(context, {
    ...options,
    connectedEvent: {
      createData: () =>
        jobEventsSystemMessageSchema.parse({ channel: options.channel, status: jobEventsConnectedEvent }),
      eventName: jobEventsConnectedEvent,
    },
    getMessageId: options.getMessageId ?? ((message) => message.jobId),
    heartbeatEvent: {
      createData: () =>
        jobEventsSystemMessageSchema.parse({ channel: options.channel, status: jobEventsHeartbeatEvent }),
      eventName: jobEventsHeartbeatEvent,
    },
    parseMessage: (rawMessage) => {
      try {
        const value = JSON.parse(rawMessage) as unknown;
        return jobProgressMessageSchema.safeParse(value).success ? (value as TMessage) : null;
      } catch {
        return null;
      }
    },
  });
}
