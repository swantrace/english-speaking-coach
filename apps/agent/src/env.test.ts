import { describe, expect, it } from "vitest";

import {
  getAgentEnvFilePath,
  getBackendBaseUrl,
  getRequiredEnv,
  resolveAgentModelProvider,
  validateAgentEnvironment,
} from "./env";

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
  it("requires LiveKit credentials in every mode", () => {
    expect(() => validateAgentEnvironment({ AGENT_MODEL_PROVIDER: "livekit", API_TOKEN: "token" })).toThrow(
      "Agent requires the following environment variables: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET",
    );
  });

  it("accepts plugin mode when provider API keys are present", () => {
    expect(() =>
      validateAgentEnvironment({
        AGENT_MODEL_PROVIDER: "plugins",
        API_TOKEN: "token",
        LIVEKIT_API_KEY: "key",
        LIVEKIT_API_SECRET: "secret",
        LIVEKIT_URL: "wss://demo.livekit.cloud",
        OPENAI_API_KEY: "openai-key",
      }),
    ).not.toThrow();
  });

  it("rejects plugin mode when provider API keys are missing", () => {
    expect(() =>
      validateAgentEnvironment({
        AGENT_MODEL_PROVIDER: "plugins",
        API_TOKEN: "token",
        LIVEKIT_API_KEY: "key",
        LIVEKIT_API_SECRET: "secret",
        LIVEKIT_URL: "wss://demo.livekit.cloud",
      }),
    ).toThrow("Agent requires the following environment variables: OPENAI_API_KEY");
  });

  it("requires the internal API token for backend handoff", () => {
    expect(() =>
      validateAgentEnvironment({
        AGENT_MODEL_PROVIDER: "livekit",
        LIVEKIT_API_KEY: "key",
        LIVEKIT_API_SECRET: "secret",
        LIVEKIT_URL: "wss://demo.livekit.cloud",
      }),
    ).toThrow("Agent requires the following environment variables: API_TOKEN");
  });
});

describe("getBackendBaseUrl", () => {
  it("defaults to the local backend origin", () => {
    expect(getBackendBaseUrl({})).toBe("http://localhost:3001");
  });

  it("strips a trailing slash from configured origins", () => {
    expect(getBackendBaseUrl({ BACKEND_BASE_URL: "https://coach.example/" })).toBe("https://coach.example");
  });
});

describe("getAgentEnvFilePath", () => {
  it("resolves the env file relative to the agent package", () => {
    expect(getAgentEnvFilePath()).toMatch(/apps\/agent\/.env\.local$/);
  });
});
