import { type GoalProgressPacket, goalProgressPacketSchema, uiUpdatePacketSchema } from "@english-coach/contract";
import { type Room, RoomEvent } from "livekit-client";
import { useEffect, useRef } from "react";
import { appendObservation, seedGoalProgress, updateGoalProgress } from "../../lib/livekit-packet-stores";
import type { getSessionLaunchSnapshot } from "../../lib/session-launch-store";

export function SessionPacketBridge({
  room,
  roomName,
  snapshot,
}: {
  room: Room;
  roomName: string;
  snapshot: ReturnType<typeof getSessionLaunchSnapshot>;
}) {
  const initialSeededRef = useRef(false);

  useEffect(() => {
    if (!snapshot || snapshot.sessionType !== "role-play" || !snapshot.scenario || initialSeededRef.current) {
      return;
    }

    const seedPacket: GoalProgressPacket = {
      currentGoalId: snapshot.scenario.goals.goals[0]?.id ?? "",
      filledSlots: {},
      goals: snapshot.scenario.goals.goals.map((goal) => ({
        description: goal.description,
        id: goal.id,
        optional: goal.optional,
        status: "incomplete",
      })),
      type: "goal-progress",
    };

    seedGoalProgress(roomName, seedPacket);
    initialSeededRef.current = true;
  }, [roomName, snapshot]);

  useEffect(() => {
    const decoder = new TextDecoder();
    const handlePacket = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(decoder.decode(payload)) as unknown;
        const parsedGoalProgress = goalProgressPacketSchema.safeParse(data);

        if (parsedGoalProgress.success) {
          updateGoalProgress(roomName, parsedGoalProgress.data);
          return;
        }

        const parsedUiUpdate = uiUpdatePacketSchema.safeParse(data);

        if (parsedUiUpdate.success) {
          appendObservation(roomName, parsedUiUpdate.data);
        }
      } catch {
        // Ignore packets that belong to other topics or payload shapes.
      }
    };

    room.on(RoomEvent.DataReceived, handlePacket);

    return () => {
      room.off(RoomEvent.DataReceived, handlePacket);
    };
  }, [room, roomName]);

  return null;
}
