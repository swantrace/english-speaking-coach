import { ConnectionState, Room, type RoomConnectOptions, RoomEvent, type RoomEventCallbacks } from "livekit-client";
import type { LiveSessionConnectionStatus, LiveSessionRoomConnection } from "../types";

export interface SessionRoomEventHandlers {
  onConnectionStateChange?: (status: LiveSessionConnectionStatus) => void;
  onDataReceived?: RoomEventCallbacks["dataReceived"];
  onDisconnected?: (reason?: unknown) => void;
  onReconnected?: () => void;
  onReconnecting?: () => void;
  onTranscriptionReceived?: RoomEventCallbacks["transcriptionReceived"];
}

const defaultRoomConnectOptions: RoomConnectOptions = {
  autoSubscribe: true,
};

export function createSessionRoom() {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    stopLocalTrackOnUnpublish: true,
  });
}

export function mapLiveKitConnectionState(state: ConnectionState): LiveSessionConnectionStatus {
  switch (state) {
    case ConnectionState.Connecting:
      return "connecting";
    case ConnectionState.Connected:
      return "connected";
    case ConnectionState.Reconnecting:
    case ConnectionState.SignalReconnecting:
      return "reconnecting";
    case ConnectionState.Disconnected:
      return "disconnected";
    default:
      return "disconnected";
  }
}

export async function connectSessionRoom(room: Room, connection: LiveSessionRoomConnection) {
  await room.connect(connection.serverUrl, connection.token, defaultRoomConnectOptions);
  await room.localParticipant.setMicrophoneEnabled(true);
}

export function disconnectSessionRoom(room: Room) {
  room.disconnect();
}

export function bindSessionRoomEvents(room: Room, handlers: SessionRoomEventHandlers) {
  const handleConnectionStateChanged = (state: ConnectionState) => {
    handlers.onConnectionStateChange?.(mapLiveKitConnectionState(state));
  };
  const handleReconnecting = () => {
    handlers.onReconnecting?.();
  };
  const handleReconnected = () => {
    handlers.onReconnected?.();
  };
  const handleDisconnected = (reason?: unknown) => {
    handlers.onDisconnected?.(reason);
  };
  const handleDataReceived = handlers.onDataReceived;
  const handleTranscriptionReceived = handlers.onTranscriptionReceived;

  room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
  room.on(RoomEvent.Reconnecting, handleReconnecting);
  room.on(RoomEvent.SignalReconnecting, handleReconnecting);
  room.on(RoomEvent.Reconnected, handleReconnected);
  room.on(RoomEvent.Disconnected, handleDisconnected);

  if (handleDataReceived) {
    room.on(RoomEvent.DataReceived, handleDataReceived);
  }

  if (handleTranscriptionReceived) {
    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
  }

  return () => {
    room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
    room.off(RoomEvent.Reconnecting, handleReconnecting);
    room.off(RoomEvent.SignalReconnecting, handleReconnecting);
    room.off(RoomEvent.Reconnected, handleReconnected);
    room.off(RoomEvent.Disconnected, handleDisconnected);

    if (handleDataReceived) {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    }

    if (handleTranscriptionReceived) {
      room.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
    }
  };
}
