import { describe, expect, test } from "bun:test";
import { defaultLiveKitAgentName, getLiveKitAgentName } from "./livekit-agent-name";

describe("getLiveKitAgentName", () => {
  test("uses the production dispatch name by default", () => {
    expect(getLiveKitAgentName({})).toBe(defaultLiveKitAgentName);
  });

  test("uses a profile-specific dispatch name when configured", () => {
    expect(getLiveKitAgentName({ LIVEKIT_AGENT_NAME: "english-speaking-coach-agent-local-practice" })).toBe(
      "english-speaking-coach-agent-local-practice",
    );
  });
});
