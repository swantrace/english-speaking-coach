import { describe, expect, it, vi } from "vitest";

import { bootstrapAgent } from "./bootstrap";

describe("bootstrapAgent", () => {
  it("loads the selected environment before importing modules that create queues", async () => {
    const events: string[] = [];
    const loadEnvironment = vi.fn(() => {
      events.push("environment");
    });
    const startAgent = vi.fn(async () => {
      events.push("agent");
    });

    await bootstrapAgent({ loadEnvironment, startAgent });

    expect(events).toEqual(["environment", "agent"]);
    expect(loadEnvironment).toHaveBeenCalledOnce();
    expect(startAgent).toHaveBeenCalledOnce();
  });

  it("does not start the Agent when environment loading fails", async () => {
    const startAgent = vi.fn(async () => undefined);

    await expect(
      bootstrapAgent({
        loadEnvironment: () => {
          throw new Error("invalid environment");
        },
        startAgent,
      }),
    ).rejects.toThrow("invalid environment");

    expect(startAgent).not.toHaveBeenCalled();
  });
});
