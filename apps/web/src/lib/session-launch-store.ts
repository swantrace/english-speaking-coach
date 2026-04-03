import { scenarioSchema, sessionTypeSchema } from "@english-coach/contract";
import { z } from "zod";

const storageKeyPrefix = "english-coach:launch:";

export const sessionLaunchSnapshotSchema = z.object({
  contextDocument: z.string().trim().min(1).optional(),
  launchedAt: z.string(),
  roomName: z.string().min(1),
  scenario: scenarioSchema.optional(),
  selectedCharacterIndex: z.number().int().min(0).max(1).optional(),
  sessionType: sessionTypeSchema,
  token: z.string().min(1),
});

export type SessionLaunchSnapshot = z.infer<typeof sessionLaunchSnapshotSchema>;

function getStorageKey(roomName: string) {
  return `${storageKeyPrefix}${roomName}`;
}

export function saveSessionLaunchSnapshot(snapshot: SessionLaunchSnapshot) {
  sessionStorage.setItem(getStorageKey(snapshot.roomName), JSON.stringify(sessionLaunchSnapshotSchema.parse(snapshot)));
}

export function getSessionLaunchSnapshot(roomName: string) {
  const rawValue = sessionStorage.getItem(getStorageKey(roomName));

  if (!rawValue) {
    return null;
  }

  try {
    return sessionLaunchSnapshotSchema.parse(JSON.parse(rawValue) as unknown);
  } catch {
    sessionStorage.removeItem(getStorageKey(roomName));
    return null;
  }
}

export function removeSessionLaunchSnapshot(roomName: string) {
  sessionStorage.removeItem(getStorageKey(roomName));
}
