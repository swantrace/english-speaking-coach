import type { SessionType } from "@english-coach/domain";

export function formatSessionType(sessionType: SessionType) {
  return sessionType === "role-play" ? "Role-play" : "Free-form";
}

export function formatDurationSeconds(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return "Unavailable";
  }

  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0 && seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}m ${seconds}s`;
}

export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}
