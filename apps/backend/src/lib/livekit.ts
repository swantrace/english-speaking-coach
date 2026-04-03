import { RoomServiceClient } from "livekit-server-sdk";

let roomServiceClient: RoomServiceClient | null = null;

function normalizeLiveKitHost(url: string) {
  if (url.startsWith("ws://")) {
    return `http://${url.slice("ws://".length)}`;
  }

  if (url.startsWith("wss://")) {
    return `https://${url.slice("wss://".length)}`;
  }

  return url;
}

export function getRoomServiceClient() {
  if (roomServiceClient) {
    return roomServiceClient;
  }

  const liveKitUrl = process.env.LIVEKIT_URL?.trim();
  const liveKitApiKey = process.env.LIVEKIT_API_KEY?.trim();
  const liveKitApiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!liveKitUrl || !liveKitApiKey || !liveKitApiSecret) {
    throw new Error("LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are required for room data dispatch");
  }

  roomServiceClient = new RoomServiceClient(normalizeLiveKitHost(liveKitUrl), liveKitApiKey, liveKitApiSecret);

  return roomServiceClient;
}
