import {
  type GoalProgressPacket,
  goalProgressPacketSchema,
  type SessionStatusPacket,
  sessionStatusPacketSchema,
  type UiUpdatePacket,
  uiUpdatePacketSchema,
} from "@english-coach/contract/session";
import { type SessionPacketTopic, sessionPacketTopics } from "./topics";

type ParsedSessionPacket =
  | { kind: "goal-progress"; payload: GoalProgressPacket }
  | { kind: "hint"; payload: UiUpdatePacket }
  | { kind: "system"; payload: SessionStatusPacket };

function decodePacketPayload(payload: Uint8Array) {
  try {
    return JSON.parse(new TextDecoder().decode(payload)) as unknown;
  } catch {
    return null;
  }
}

function reportPacketParsingIssue(topic: string | undefined, payload: unknown) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.warn("Ignored invalid live session packet", {
    payload,
    topic,
  });
}

export function parseSessionPacket(payload: Uint8Array, topic?: string): ParsedSessionPacket | null {
  const decodedPayload = decodePacketPayload(payload);

  if (decodedPayload === null) {
    reportPacketParsingIssue(topic, null);
    return null;
  }

  switch (topic as SessionPacketTopic | undefined) {
    case sessionPacketTopics.goalProgress: {
      const parsed = goalProgressPacketSchema.safeParse(decodedPayload);

      if (!parsed.success) {
        reportPacketParsingIssue(topic, decodedPayload);
        return null;
      }

      return {
        kind: "goal-progress",
        payload: parsed.data,
      };
    }
    case sessionPacketTopics.hint: {
      const parsed = uiUpdatePacketSchema.safeParse(decodedPayload);

      if (!parsed.success) {
        reportPacketParsingIssue(topic, decodedPayload);
        return null;
      }

      return {
        kind: "hint",
        payload: parsed.data,
      };
    }
    case sessionPacketTopics.system: {
      const parsed = sessionStatusPacketSchema.safeParse(decodedPayload);

      if (!parsed.success) {
        reportPacketParsingIssue(topic, decodedPayload);
        return null;
      }

      return {
        kind: "system",
        payload: parsed.data,
      };
    }
    default:
      reportPacketParsingIssue(topic, decodedPayload);
      return null;
  }
}
