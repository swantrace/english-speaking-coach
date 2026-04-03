export interface TranscriptMessageLike {
  from?: {
    isLocal?: boolean | null;
  } | null;
  id?: string | null;
  message?: string | null;
  timestamp?: Date | number | string | null;
}

export interface TranscriptEntry {
  id: string;
  message: string;
  speaker: "assistant" | "user";
  timestamp: Date | null;
}

function normalizeTimestamp(value: TranscriptMessageLike["timestamp"]) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function getTranscriptEntries(messages: TranscriptMessageLike[]) {
  return messages.flatMap<TranscriptEntry>((message, index) => {
    const text = typeof message.message === "string" ? message.message.trim() : "";

    if (!text) {
      return [];
    }

    const timestamp = normalizeTimestamp(message.timestamp);

    return [
      {
        id: typeof message.id === "string" && message.id.length > 0 ? message.id : `message-${index}`,
        message: text,
        speaker: message.from?.isLocal ? "user" : "assistant",
        timestamp,
      },
    ];
  });
}

export function formatAgentStateLabel(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}
