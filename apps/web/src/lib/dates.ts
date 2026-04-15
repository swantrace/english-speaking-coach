import dayjs from "dayjs";

export function formatDate(value: string) {
  return dayjs(value).format("MMM D, YYYY");
}

export function formatDateTime(value: string) {
  return dayjs(value).format("MMM D, YYYY h:mm A");
}

export function getDurationSeconds(startedAt: string, endedAt: string | null) {
  if (!endedAt) {
    return null;
  }

  const seconds = dayjs(endedAt).diff(dayjs(startedAt), "second", true);

  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
}
