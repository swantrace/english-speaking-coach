import type { Participant, Room, TranscriptionSegment } from "livekit-client";
import type { SessionTranscriptTurn } from "../types";

function getSpeaker(participant: Participant | undefined, room: Room): SessionTranscriptTurn["speaker"] {
  if (participant?.identity === room.localParticipant.identity || participant?.isLocal) {
    return "user";
  }

  return "assistant";
}

function getSpeakerLabel(speaker: SessionTranscriptTurn["speaker"]) {
  return speaker === "user" ? "You" : "Coach";
}

export function mapTranscriptionSegmentsToTurns(params: {
  participant?: Participant;
  room: Room;
  segments: TranscriptionSegment[];
}): SessionTranscriptTurn[] {
  const speaker = getSpeaker(params.participant, params.room);

  return params.segments
    .filter((segment) => segment.text.trim().length > 0)
    .map((segment) => ({
      id: `${speaker}:${segment.id}`,
      order: segment.firstReceivedTime,
      speaker,
      speakerLabel: getSpeakerLabel(speaker),
      status: segment.final ? "final" : "partial",
      text: segment.text.trim(),
      timestampMs: segment.lastReceivedTime,
    }));
}
