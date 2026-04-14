import type { RoomEventCallbacks } from "livekit-client";
import { type PropsWithChildren, useEffect, useMemo } from "react";
import { SessionLiveKitProvider } from "../livekit/components-adapter";
import { mapHintPacketToHint } from "../livekit/hint-adapter";
import { parseSessionPacket } from "../livekit/parsers";
import { bindSessionRoomEvents, connectSessionRoom, createSessionRoom, disconnectSessionRoom } from "../livekit/room";
import { mapTranscriptionSegmentsToTurns } from "../livekit/transcript-adapter";
import { mapGoalProgressPacketToViewModel } from "../mappers";
import { useSessionRuntimeStore } from "../runtime/store";
import type { LiveSessionBootstrap } from "../types";

interface SessionRuntimeControllerProps extends PropsWithChildren {
  bootstrap: LiveSessionBootstrap;
}

export function SessionRuntimeController({ bootstrap, children }: SessionRuntimeControllerProps) {
  const room = useMemo(() => createSessionRoom(), []);
  const initializeSessionRuntime = useSessionRuntimeStore((state) => state.initializeSessionRuntime);
  const resetSessionRuntime = useSessionRuntimeStore((state) => state.resetSessionRuntime);
  const setConnectionError = useSessionRuntimeStore((state) => state.setConnectionError);
  const setConnectionStatus = useSessionRuntimeStore((state) => state.setConnectionStatus);
  const setGoalProgress = useSessionRuntimeStore((state) => state.setGoalProgress);
  const upsertHint = useSessionRuntimeStore((state) => state.upsertHint);
  const upsertTranscriptTurn = useSessionRuntimeStore((state) => state.upsertTranscriptTurn);

  useEffect(() => {
    let disposed = false;

    initializeSessionRuntime({ sessionId: bootstrap.sessionId });
    setConnectionError(null);

    const handleDataReceived: RoomEventCallbacks["dataReceived"] = (payload, _participant, _kind, topic) => {
      const packet = parseSessionPacket(payload, topic);

      if (!packet) {
        return;
      }

      if (packet.kind === "goal-progress") {
        setGoalProgress(mapGoalProgressPacketToViewModel(packet.payload));
        return;
      }

      if (packet.kind === "hint") {
        upsertHint(mapHintPacketToHint(packet.payload));
        return;
      }

      if (packet.kind === "system" && packet.payload.status === "ended") {
        setConnectionStatus("disconnected");
      }
    };

    const handleTranscriptionReceived: RoomEventCallbacks["transcriptionReceived"] = (segments, participant) => {
      const nextTurns = mapTranscriptionSegmentsToTurns({
        participant,
        room,
        segments,
      });

      for (const turn of nextTurns) {
        upsertTranscriptTurn(turn);
      }
    };

    const unbindEvents = bindSessionRoomEvents(room, {
      onConnectionStateChange: setConnectionStatus,
      onDataReceived: handleDataReceived,
      onDisconnected: () => {
        if (!disposed) {
          setConnectionStatus("disconnected");
        }
      },
      onReconnected: () => {
        setConnectionError(null);
        setConnectionStatus("connected");
      },
      onReconnecting: () => {
        setConnectionStatus("reconnecting");
      },
      onTranscriptionReceived: handleTranscriptionReceived,
    });

    void (async () => {
      try {
        await connectSessionRoom(room, bootstrap.room);

        if (!disposed) {
          setConnectionStatus("connected");
        }
      } catch (error) {
        if (disposed) {
          return;
        }

        setConnectionError(error instanceof Error ? error.message : "We couldn't connect to the live practice room.");
        setConnectionStatus("error");
      }
    })();

    return () => {
      disposed = true;
      unbindEvents();
      disconnectSessionRoom(room);
      resetSessionRuntime();
    };
  }, [
    bootstrap.room,
    bootstrap.sessionId,
    initializeSessionRuntime,
    resetSessionRuntime,
    room,
    setConnectionError,
    setConnectionStatus,
    setGoalProgress,
    upsertHint,
    upsertTranscriptTurn,
  ]);

  return <SessionLiveKitProvider room={room}>{children}</SessionLiveKitProvider>;
}
