import { isSessionProcessingTerminal, type SessionProcessingSnapshot } from "@english-coach/contract/session";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { queryKeys } from "@/lib/query-keys";
import { connectSessionProcessingStream } from "./sse";

export type SessionProcessingConnectionState = "idle" | "connecting" | "open" | "error" | "closed";

export function useSessionProcessingStream({
  enabled,
  processing,
  sessionId,
}: {
  enabled: boolean;
  processing: SessionProcessingSnapshot | null;
  sessionId: string;
}) {
  const queryClient = useQueryClient();
  const terminal = processing ? isSessionProcessingTerminal(processing) : false;
  const [connectionState, setConnectionState] = useState<SessionProcessingConnectionState>(
    enabled && !terminal ? "connecting" : "idle",
  );

  useEffect(() => {
    if (!enabled || !sessionId || terminal) {
      setConnectionState(enabled && sessionId ? "closed" : "idle");
      return;
    }

    setConnectionState("connecting");

    const disconnect = connectSessionProcessingStream({
      onError: () => {
        setConnectionState("error");
      },
      onEvent: () => {
        setConnectionState("open");
        void queryClient.invalidateQueries({
          exact: true,
          queryKey: queryKeys.history.detail(sessionId),
        });
      },
      onOpen: () => {
        setConnectionState("open");
      },
      onTerminal: () => {
        setConnectionState("closed");
      },
      sessionId,
    });

    return () => {
      disconnect();
      setConnectionState("closed");
    };
  }, [enabled, queryClient, sessionId, terminal]);

  return connectionState;
}
