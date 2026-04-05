import { describe, expect, it } from "vitest";
import { appendObservation, getObservationsSnapshot, resetObservations } from "./livekit-packet-stores";

describe("getObservationsSnapshot", () => {
  it("returns the same empty snapshot instance until room data exists", () => {
    resetObservations("room-a");

    const firstSnapshot = getObservationsSnapshot("room-a");
    const secondSnapshot = getObservationsSnapshot("room-a");

    expect(firstSnapshot).toBe(secondSnapshot);
    expect(firstSnapshot.items).toEqual([]);
  });

  it("returns appended observations for the room", () => {
    resetObservations("room-b");
    appendObservation("room-b", {
      prompt: "Notice the hesitation before the answer.",
      promptKind: "fluency_hint",
      sessionHistoryId: "session-1",
      transcriptTurnIndex: 4,
      type: "ui-update",
    });

    const snapshot = getObservationsSnapshot("room-b");

    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      prompt: "Notice the hesitation before the answer.",
      promptKind: "fluency_hint",
      sessionHistoryId: "session-1",
      transcriptTurnIndex: 4,
      type: "ui-update",
    });
  });
});
