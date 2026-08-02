import {
  isSessionProcessingTerminal,
  type SessionProcessingEvent,
  sessionProcessingEventName,
  sessionProcessingEventSchema,
} from "@english-coach/contract/session";
import { connectEventSource } from "@/lib/sse";
import { getSessionHistoryEventsPath } from "./api";

interface ConnectSessionProcessingStreamOptions {
  onError?: () => void;
  onEvent: (event: SessionProcessingEvent) => void;
  onOpen?: () => void;
  onTerminal?: (event: SessionProcessingEvent) => void;
  sessionId: string;
}

export function createSessionProcessingStreamUrl(sessionId: string) {
  const path = getSessionHistoryEventsPath(sessionId);
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  return baseUrl ? new URL(path, baseUrl).toString() : path;
}

export function parseSessionProcessingEventData(rawData: string) {
  try {
    const parsed = sessionProcessingEventSchema.safeParse(JSON.parse(rawData));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function connectSessionProcessingStream({
  onError,
  onEvent,
  onOpen,
  onTerminal,
  sessionId,
}: ConnectSessionProcessingStreamOptions) {
  let disconnect: () => void = () => undefined;
  const handleProcessingEvent = (event: MessageEvent<string>) => {
    const parsed = parseSessionProcessingEventData(event.data);

    if (!parsed || parsed.processing.sessionHistoryId !== sessionId) {
      return;
    }

    onEvent(parsed);

    if (isSessionProcessingTerminal(parsed.processing)) {
      onTerminal?.(parsed);
      disconnect();
    }
  };

  disconnect = connectEventSource({
    listeners: [{ eventName: sessionProcessingEventName, handleEvent: handleProcessingEvent }],
    onError,
    onOpen,
    url: createSessionProcessingStreamUrl(sessionId),
  });

  return disconnect;
}
