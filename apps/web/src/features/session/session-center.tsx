import { Button } from "@english-coach/ui";
import {
  BarVisualizer,
  ConnectionStateToast,
  TrackToggle,
  useAgent,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { type FormEvent, useState } from "react";
import { formatAgentStateLabel } from "../../lib/agent-session-helpers";
import { connectionStyles, ellipsize } from "../../lib/app-data";
import { Card } from "../../lib/app-shell";
import { getSessionLaunchSnapshot } from "../../lib/session-launch-store";
import { SessionTranscriptPanel } from "./session-transcript-panel";

export function SessionCenter({ roomName }: { roomName: string }) {
  const session = useSessionContext();
  const { isSending, messages, send } = useSessionMessages(session);
  const { microphoneTrack, state } = useAgent(session);
  const [chatMessage, setChatMessage] = useState("");
  const snapshot = getSessionLaunchSnapshot(roomName);

  const handleMessageSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedMessage = chatMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    await send(trimmedMessage);
    setChatMessage("");
  };

  return (
    <div className="grid gap-6">
      <Card className="grid gap-5 p-6">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-orange-100">
              {snapshot?.sessionType === "role-play" ? "Role-play session" : "Free-form session"}
            </span>
            <span
              className={`rounded-full border px-3 py-1 ${
                connectionStyles[session.connectionState as keyof typeof connectionStyles]
              }`}
            >
              {session.connectionState}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">
              Agent {formatAgentStateLabel(state)}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start">
            <div className="grid gap-2">
              <h1 className="text-3xl text-white sm:text-4xl">Room {roomName}</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300">
                Keep the transcript central. Voice responses, packet-driven hints, and text nudges should all feed the
                same conversation surface instead of splitting attention across separate panes.
              </p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active context</p>
              <p className="mt-2 leading-7 text-slate-300">
                {snapshot?.sessionType === "role-play" && snapshot.scenario
                  ? `${snapshot.scenario.title} with ${snapshot.scenario.characters[snapshot.selectedCharacterIndex ?? 0]?.name ?? "your selected role"}`
                  : ellipsize(snapshot?.contextDocument ?? "Open coaching", 120)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <ConnectionStateToast className="lk-coach-toast" />

      <SessionTranscriptPanel agentState={state} messages={messages} roomName={roomName} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <Card className="grid gap-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg text-white">Steer the session</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Text + microphone</span>
          </div>
          <form
            className="grid gap-4 rounded-[22px] border border-cyan-300/15 bg-cyan-300/10 p-5"
            onSubmit={(event) => void handleMessageSend(event)}
          >
            <p className="text-sm leading-7 text-slate-200">
              Use the microphone for the main flow. Send text only when you want to nudge the agent or ask for a quick
              redirect without breaking cadence.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TrackToggle
                className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-300/40"
                source={Track.Source.Microphone}
              >
                Toggle microphone
              </TrackToggle>
              <Button
                onClick={() => {
                  void session.end();
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Leave session
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <label className="grid gap-2 text-sm text-slate-200">
                <span className="font-medium">Send a text message</span>
                <textarea
                  className="min-h-24 rounded-[18px] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300/40"
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Ask the agent to slow down, switch focus, or clarify something."
                  value={chatMessage}
                />
              </label>
              <Button disabled={isSending || !chatMessage.trim()} size="lg" type="submit">
                {isSending ? "Sending..." : "Send message"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="grid gap-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg text-white">Agent voice</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">LiveKit audio</span>
          </div>
          <div className="grid min-h-48 place-items-center rounded-[22px] border border-orange-300/15 bg-orange-300/10 p-6">
            {microphoneTrack ? (
              <BarVisualizer barCount={9} options={{ minHeight: 6 }} trackRef={microphoneTrack} />
            ) : (
              <span className="text-sm text-slate-400">Waiting for the agent audio track...</span>
            )}
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
            {snapshot?.sessionType === "role-play"
              ? "Watch the transcript for mission progress cues under your turns while the right rail keeps the goal list visible."
              : "Watch the transcript for follow-up prompts under your turns while the right rail keeps the recent coaching cues easy to skim."}
          </div>
        </Card>
      </div>
    </div>
  );
}
