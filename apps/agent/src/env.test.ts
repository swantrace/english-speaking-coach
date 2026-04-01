import { describe, expect, it } from "vitest";

import { getAgentEnvFilePath, getRequiredEnv, resolveAgentModelProvider, validateAgentEnvironment } from "./env";

describe("getRequiredEnv", () => {
  it("returns a required environment variable when present", () => {
    expect(getRequiredEnv("OPENAI_API_KEY", { OPENAI_API_KEY: "openai-key" })).toBe("openai-key");
  });

  it("throws when a required environment variable is missing", () => {
    expect(() => getRequiredEnv("OPENAI_API_KEY", {})).toThrow("Missing required environment variable: OPENAI_API_KEY");
  });
});

describe("resolveAgentModelProvider", () => {
  it("defaults to plugins for a local self-hosted LiveKit server", () => {
    expect(resolveAgentModelProvider({ LIVEKIT_URL: "ws://livekit:7880" })).toBe("plugins");
  });

  it("defaults to livekit for LiveKit Cloud URLs", () => {
    expect(resolveAgentModelProvider({ LIVEKIT_URL: "wss://demo.livekit.cloud" })).toBe("livekit");
  });

  it("allows an explicit provider override", () => {
    expect(
      resolveAgentModelProvider({
        AGENT_MODEL_PROVIDER: "livekit",
        LIVEKIT_URL: "ws://livekit:7880",
      }),
    ).toBe("livekit");
  });
});

describe("validateAgentEnvironment", () => {
  it("accepts plugin mode when provider API keys are present", () => {
    expect(() =>
      validateAgentEnvironment({
        AGENT_MODEL_PROVIDER: "plugins",
        OPENAI_API_KEY: "openai-key",
      }),
    ).not.toThrow();
  });

  it("rejects plugin mode when provider API keys are missing", () => {
    expect(() => validateAgentEnvironment({ AGENT_MODEL_PROVIDER: "plugins" })).toThrow(
      "AGENT_MODEL_PROVIDER=plugins requires the following environment variables: OPENAI_API_KEY",
    );
  });
});

describe("getAgentEnvFilePath", () => {
  it("resolves the env file relative to the agent package", () => {
    expect(getAgentEnvFilePath()).toMatch(/apps\/agent\/.env\.local$/);
  });
});
