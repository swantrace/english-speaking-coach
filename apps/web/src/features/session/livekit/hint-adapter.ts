import type { UiUpdatePacket } from "@english-coach/contract";
import type { SessionHint } from "../types";

function getHintLabel(kind: UiUpdatePacket["promptKind"]): SessionHint["label"] {
  switch (kind) {
    case "error_hint":
      return "Accuracy";
    case "knowledge_hint":
      return "Pattern";
    case "fluency_hint":
      return "Fluency";
    default:
      return "Hint";
  }
}

export function mapHintPacketToHint(packet: UiUpdatePacket): SessionHint {
  return {
    attachedTurnId: null,
    id: `hint:${packet.sessionHistoryId}:${packet.transcriptTurnIndex ?? "latest"}:${packet.promptKind}:${packet.prompt}`,
    kind: packet.promptKind,
    label: getHintLabel(packet.promptKind),
    text: packet.prompt,
    timestampMs: Date.now(),
    transcriptTurnIndex: packet.transcriptTurnIndex ?? null,
  };
}
