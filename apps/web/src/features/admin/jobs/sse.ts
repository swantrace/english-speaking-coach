import {
  jobEventsConnectedEvent,
  jobEventsHeartbeatEvent,
  jobEventsSystemMessageSchema,
} from "@english-coach/contract/job-events";
import { getAdminJobStreamPath } from "./api";
import { type AdminJobStreamEvent, adminJobStreamEventSchema } from "./types";

interface ConnectAdminJobStreamOptions {
  submissionId: string;
  onError?: () => void;
  onEvent: (event: AdminJobStreamEvent) => void;
  onOpen?: () => void;
  onSystemEvent?: (status: "connected" | "heartbeat") => void;
}

function createStreamUrl(submissionId: string) {
  const path = getAdminJobStreamPath(submissionId);
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  return baseUrl ? new URL(path, baseUrl).toString() : path;
}

function parseJsonData(rawData: string) {
  try {
    return JSON.parse(rawData) as unknown;
  } catch {
    return null;
  }
}

function parseStreamEvent(rawData: string) {
  const parsedData = parseJsonData(rawData);

  if (!parsedData) {
    return null;
  }

  const parsed = adminJobStreamEventSchema.safeParse(parsedData);

  return parsed.success ? parsed.data : null;
}

function parseSystemEvent(rawData: string) {
  const parsedData = parseJsonData(rawData);

  if (!parsedData) {
    return null;
  }

  const parsed = jobEventsSystemMessageSchema.safeParse(parsedData);

  return parsed.success ? parsed.data : null;
}

export function connectAdminJobStream({
  submissionId,
  onError,
  onEvent,
  onOpen,
  onSystemEvent,
}: ConnectAdminJobStreamOptions) {
  const eventSource = new EventSource(createStreamUrl(submissionId), { withCredentials: true });
  const handleJobUpdate = (event: MessageEvent<string>) => {
    const parsed = parseStreamEvent(event.data);

    if (parsed && parsed.submissionId === submissionId) {
      onEvent(parsed);
    }
  };
  const handleSystemEvent = (event: MessageEvent<string>) => {
    const parsed = parseSystemEvent(event.data);

    if (parsed) {
      onSystemEvent?.(parsed.status);
    }
  };

  eventSource.onopen = () => {
    onOpen?.();
  };

  eventSource.onerror = () => {
    onError?.();
  };

  eventSource.onmessage = handleJobUpdate;
  eventSource.addEventListener("job.updated", handleJobUpdate as EventListener);
  eventSource.addEventListener(jobEventsConnectedEvent, handleSystemEvent as EventListener);
  eventSource.addEventListener(jobEventsHeartbeatEvent, handleSystemEvent as EventListener);

  return () => {
    eventSource.close();
  };
}
