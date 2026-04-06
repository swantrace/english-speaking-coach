import { type GoalProgressPacket, sessionDispatchMetadataSchema } from "@english-coach/contract";

import { Agent } from "./Agent";
import { goalProgressPacketToTranscriptAnnotations } from "./role-play";
import { fetchSessionBootstrapFromBackend, persistTranscriptAnnotations } from "./runtime-services";
import type { LocalParticipantGetter } from "./types";

export async function prepareAgent(metadata: string, getLocalParticipant: LocalParticipantGetter): Promise<Agent> {
  const { sessionHistoryId } = sessionDispatchMetadataSchema.parse(JSON.parse(metadata));

  const session = await fetchSessionBootstrapFromBackend(sessionHistoryId);

  const publishGoalProgress = async (packet: GoalProgressPacket) => {
    const localParticipant = getLocalParticipant();

    if (!localParticipant) {
      throw new Error("Local participant is unavailable for room data publishing.");
    }

    await localParticipant.publishData(new TextEncoder().encode(JSON.stringify(packet)), {
      reliable: true,
      topic: packet.type,
    });

    const annotations = goalProgressPacketToTranscriptAnnotations(packet);

    if (annotations.length > 0) {
      await persistTranscriptAnnotations(session.sessionHistoryId, annotations);
    }
  };

  switch (session.sessionType) {
    case "role-play":
      return new Agent({
        ...session,
        publishGoalProgress,
      });
    case "free-form":
      return new Agent(session);
    default:
      throw new Error(`Unsupported session type: ${JSON.stringify(session)}`);
  }
}
