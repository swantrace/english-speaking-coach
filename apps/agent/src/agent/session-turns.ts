import type { SessionTurn } from "@english-coach/contract/session";
import type { llm } from "@livekit/agents";

export function toSessionTurns(chatContext: Pick<llm.ChatContext, "items">): SessionTurn[] {
  return chatContext.items.flatMap((item) => {
    if (item.type !== "message") {
      return [];
    }

    if (item.role !== "user" && item.role !== "assistant") {
      return [];
    }

    const text = item.textContent?.trim();

    if (!text) {
      return [];
    }

    return [
      {
        speaker: item.role,
        text,
        timestampMs: item.createdAt,
      },
    ];
  });
}
