import {
  buildFreeFormInstructionsPrompt,
  buildLatestWorkerFeedbackPrompt,
  workerFeedbackPrefix,
} from "@english-coach/prompts";
import type { llm } from "@livekit/agents";
import type { FreeFormRuntimeConfig, WorkerFeedbackChatContext } from "./types";

export function createFreeFormInstructions(config: FreeFormRuntimeConfig) {
  return buildFreeFormInstructionsPrompt(config.contextDocument);
}

function isWorkerFeedbackItem(item: llm.ChatItem) {
  return item.type === "message" && item.role === "system" && item.textContent?.startsWith(workerFeedbackPrefix);
}

export function withLatestWorkerFeedback<T extends WorkerFeedbackChatContext>(chatContext: T, message: string): T {
  chatContext.items = chatContext.items.filter((item) => !isWorkerFeedbackItem(item));
  chatContext.addMessage({
    content: buildLatestWorkerFeedbackPrompt(message),
    role: "system",
  });

  return chatContext;
}
