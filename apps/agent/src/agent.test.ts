import { inference, initializeLogger, voice } from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import { afterEach, beforeEach, describe, it } from "vitest";

import { Agent } from "./agent";
import { getRequiredEnv, loadAgentEnv, resolveAgentModelProvider } from "./env";

loadAgentEnv();

initializeLogger({ level: "warn", pretty: false });

const hasLiveKitCredentials =
  Boolean(process.env.LIVEKIT_URL) && Boolean(process.env.LIVEKIT_API_KEY) && Boolean(process.env.LIVEKIT_API_SECRET);
const agentModelProvider = resolveAgentModelProvider();
const hasModelCredentials = agentModelProvider === "livekit" ? true : Boolean(process.env.OPENAI_API_KEY);

const describeIfConfigured = hasLiveKitCredentials && hasModelCredentials ? describe : describe.skip;

describeIfConfigured("agent evaluation", () => {
  let session: voice.AgentSession;
  let llmInstance: inference.LLM | openai.LLM;

  beforeEach(async () => {
    llmInstance =
      agentModelProvider === "livekit"
        ? new inference.LLM({ model: "openai/gpt-4.1-mini" })
        : new openai.LLM({ apiKey: getRequiredEnv("OPENAI_API_KEY"), model: "gpt-4.1-mini" });

    session = new voice.AgentSession({ llm: llmInstance });
    await session.start({ agent: new Agent() });
  });

  afterEach(async () => {
    await session?.close();
    await llmInstance?.aclose();
  });

  it("greets the user and offers speaking practice", { timeout: 30000 }, async () => {
    const result = await session.run({ userInput: "Hello" }).wait();

    await result.expect.nextEvent().isMessage({ role: "assistant" }).judge(llmInstance, {
      intent: "Greets the user in a friendly tone and asks a short follow-up question.",
    });

    result.expect.noMoreEvents();
  });
});
