import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { streamRedisChannelSSE } from "./redis-channel";

describe("streamRedisChannelSSE", () => {
  it("streams initial messages and closes when the domain marks one terminal", async () => {
    let disconnected = false;
    const subscriberState: { channel: string | null } = { channel: null };
    const app = new Hono();

    app.get("/events", (context) =>
      streamRedisChannelSSE(context, {
        channel: "test:scope-1",
        createSubscriber: async () => ({
          disconnect: () => {
            disconnected = true;
          },
          on: () => undefined,
          subscribe: async (channel) => {
            subscriberState.channel = channel;
          },
        }),
        eventName: "progress.updated",
        getInitialMessages: async () => [{ id: "event-1", terminal: true }],
        getMessageId: (message) => message.id,
        heartbeatEvent: { createData: () => ({}), eventName: "heartbeat" },
        parseMessage: () => null,
        shouldClose: (message) => message.terminal,
        subscriberName: "test-subscriber",
      }),
    );

    const response = await app.request("/events");
    const body = await response.text();

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body).toContain("event: progress.updated");
    expect(body).toContain("id: event-1");
    expect(body).toContain('data: {"id":"event-1","terminal":true}');
    expect(subscriberState.channel).toBe("test:scope-1");
    expect(disconnected).toBeTrue();
  });
});
