import type { llm } from "@livekit/agents";

import type { FreeFormRuntimeConfig, WorkerFeedbackChatContext } from "./types";

const workerFeedbackPrefix = "[WORKER_FEEDBACK]\n";

export function createFreeFormInstructions(config: FreeFormRuntimeConfig) {
  return [
    "You are an English speaking coach for a live voice session.",
    "Keep responses concise, practical, and easy to follow aloud.",
    "Do not mention hidden analysis or worker feedback unless it improves the conversation naturally.",
    "Use this context to ground the session:",
    config.contextDocument,
  ].join("\n\n");
}

function isWorkerFeedbackItem(item: llm.ChatItem) {
  return item.type === "message" && item.role === "system" && item.textContent?.startsWith(workerFeedbackPrefix);
}

export function withLatestWorkerFeedback<T extends WorkerFeedbackChatContext>(chatContext: T, message: string): T {
  chatContext.items = chatContext.items.filter((item) => !isWorkerFeedbackItem(item));
  chatContext.addMessage({
    content: `${workerFeedbackPrefix}${message}`,
    role: "system",
  });

  return chatContext;
}
