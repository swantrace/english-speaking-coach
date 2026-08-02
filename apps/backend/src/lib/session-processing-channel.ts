export function getSessionProcessingChannel(sessionHistoryId: string) {
  return `session-processing:${sessionHistoryId}`;
}
