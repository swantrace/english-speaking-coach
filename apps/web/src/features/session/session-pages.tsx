import {
  type GoalProgressPacket,
  goalProgressPacketSchema,
  type Scenario,
  uiUpdatePacketSchema,
} from "@english-coach/contract";
import { Button } from "@english-coach/ui";
import {
  BarVisualizer,
  ConnectionStateToast,
  TrackToggle,
  useAgent,
  useSession,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ConnectionState, type Room, RoomEvent, TokenSource, Track } from "livekit-client";
import { type FormEvent, startTransition, useEffect, useMemo, useRef, useState } from "react";
import { AgentChatTranscript } from "../../components/agents-ui/agent-chat-transcript";
import { AgentSessionProvider } from "../../components/agents-ui/agent-session-provider";
import { formatAgentStateLabel } from "../../lib/agent-session-helpers";
import { connectionStyles, ellipsize, liveKitUrl } from "../../lib/app-data";
import { AuthGate, Card, PageState } from "../../lib/app-shell";
import {
  appendObservation,
  resetGoalProgress,
  resetObservations,
  seedGoalProgress,
  updateGoalProgress,
  useGoalProgress,
  useObservations,
} from "../../lib/livekit-packet-stores";
import { getSessionLaunchSnapshot, removeSessionLaunchSnapshot } from "../../lib/session-launch-store";

function MissionSidebar({
  roomName,
  scenario,
  selectedCharacterIndex,
}: {
  roomName: string;
  scenario: Scenario;
  selectedCharacterIndex: number | undefined;
}) {
  const goalProgress = useGoalProgress(roomName);
  const selectedCharacter =
    selectedCharacterIndex === undefined ? undefined : scenario.characters[selectedCharacterIndex];
  const agentCharacter =
    selectedCharacterIndex === undefined ? undefined : scenario.characters[selectedCharacterIndex === 0 ? 1 : 0];
  const goals = goalProgress?.goals ?? scenario.goals.goals.map((goal) => ({ ...goal, status: "incomplete" as const }));
  const currentGoalId = goalProgress?.currentGoalId ?? goals.find((goal) => goal.status === "incomplete")?.id ?? "";

  return (
    <div className="grid gap-5">
      <Card className="grid gap-4 p-5">
        <div className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Scene</span>
          <h2 className="text-xl text-white">{scenario.title}</h2>
          <p className="text-sm leading-7 text-slate-300">{scenario.setting}</p>
        </div>
        <div className="grid gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">You</span>
            <span>{selectedCharacter?.name ?? "Not selected"}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Agent</span>
            <span>{agentCharacter?.name ?? "Pending"}</span>
          </div>
        </div>
      </Card>

      <Card className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl text-white">Mission</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Live goals</span>
        </div>
        <div className="grid gap-3">
          {goals.map((goal) => {
            const isCurrent = goal.id === currentGoalId;
            const isComplete = goal.status === "complete";
            const slotChips = scenario.goals.goals.find((item) => item.id === goal.id)?.logic.required_slots ?? [];

            return (
              <div
                className={`grid gap-3 rounded-[20px] border px-4 py-4 transition ${
                  isComplete
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : isCurrent
                      ? "border-orange-300/30 bg-orange-300/10"
                      : "border-white/10 bg-white/[0.03]"
                }`}
                key={goal.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <span className="text-sm font-medium text-white">{goal.description}</span>
                    {goal.optional ? (
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Optional</span>
                    ) : null}
                  </div>
                  <span className="text-lg">{isComplete ? "✓" : isCurrent ? "•" : "○"}</span>
                </div>
                {slotChips.length ? (
                  <div className="flex flex-wrap gap-2">
                    {slotChips.map((slot) => {
                      const filledValue = goalProgress?.filledSlots[slot];

                      return (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.15em] ${
                            filledValue
                              ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100"
                              : "border-white/10 bg-white/[0.04] text-slate-400"
                          }`}
                          key={slot}
                        >
                          {filledValue ? `${slot}: ${filledValue}` : slot}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ObservationsSidebar({ roomName, contextDocument }: { roomName: string; contextDocument?: string }) {
  const observations = useObservations(roomName);

  return (
    <Card className="grid gap-4 p-5">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl text-white">Live observations</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Worker packets</span>
        </div>
        <p className="text-sm leading-7 text-slate-300">
          The worker appends observations here every few turns as it analyses the conversation.
        </p>
      </div>
      {contextDocument ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Context preview</p>
          <p className="mt-2 leading-7">{ellipsize(contextDocument, 180)}</p>
        </div>
      ) : null}
      <div className="grid max-h-[32rem] gap-3 overflow-auto pr-1">
        {observations.items.length ? (
          observations.items.map((item) => (
            <div
              className="rounded-[20px] border border-emerald-300/15 bg-emerald-300/10 p-4"
              key={`${item.sessionHistoryId}:${item.observation}`}
            >
              <p className="text-sm leading-7 text-emerald-50">{item.observation}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
            No live observations yet.
          </div>
        )}
      </div>
    </Card>
  );
}

function SessionPacketBridge({
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

function SessionCenter({ roomName }: { roomName: string }) {
  const session = useSessionContext();
  const { isSending, messages, send } = useSessionMessages(session);
  const { microphoneTrack, state } = useAgent(session);
  const [chatMessage, setChatMessage] = useState("");

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
    <Card className="grid gap-6 p-6">
      <div className="grid gap-3 text-center">
        <span className="mx-auto w-fit rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-100">
          Voice Session
        </span>
        <h1 className="text-3xl text-white sm:text-4xl">Room {roomName}</h1>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
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
      </div>

      <ConnectionStateToast className="lk-coach-toast" />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg text-white">Agent voice</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">LiveKit audio</span>
          </div>
          <div className="grid min-h-40 place-items-center rounded-[22px] border border-orange-300/15 bg-orange-300/10 p-6">
            {microphoneTrack ? (
              <BarVisualizer barCount={9} options={{ minHeight: 6 }} trackRef={microphoneTrack} />
            ) : (
              <span className="text-sm text-slate-400">Waiting for the agent audio track...</span>
            )}
          </div>
        </div>

        <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg text-white">Session controls</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Session provider</span>
          </div>
          <form
            className="grid gap-4 rounded-[22px] border border-cyan-300/15 bg-cyan-300/10 p-5"
            onSubmit={(event) => void handleMessageSend(event)}
          >
            <p className="text-sm leading-7 text-slate-200">
              The room now runs through LiveKit session management, so chat and transcript updates come from the session
              message stream.
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
                  placeholder="Type if you want to steer the session with text as well as voice."
                  value={chatMessage}
                />
              </label>
              <Button disabled={isSending || !chatMessage.trim()} size="lg" type="submit">
                {isSending ? "Sending..." : "Send message"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid gap-4 rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg text-white">Session transcript</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Agent messages API</span>
        </div>
        <div className="max-h-[28rem] overflow-auto pr-1">
          <AgentChatTranscript messages={messages} agentState={state} />
        </div>
      </div>
    </Card>
  );
}

function SessionExperience({
  roomName,
  serverUrl,
  snapshot,
}: {
  roomName: string;
  serverUrl: string;
  snapshot: NonNullable<ReturnType<typeof getSessionLaunchSnapshot>>;
}) {
  const navigate = useNavigate();
  const [startError, setStartError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const tokenSource = useMemo(
    () =>
      TokenSource.literal({
        participantToken: snapshot.token,
        serverUrl,
      }),
    [serverUrl, snapshot.token],
  );
  const session = useSession(tokenSource);
  const startSession = session.start;
  const endSession = session.end;

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const startTimeout = window.setTimeout(() => {
      void startSession({ signal: abortController.signal })
        .then(() => {
          if (!isMounted || abortController.signal.aborted) {
            return;
          }

          startedRef.current = true;
          setStartError(null);
        })
        .catch((error: unknown) => {
          if (!isMounted || abortController.signal.aborted) {
            return;
          }

          setStartError(error instanceof Error ? error.message : "Failed to start the LiveKit session");
        });
    }, 0);

    return () => {
      isMounted = false;
      abortController.abort();
      window.clearTimeout(startTimeout);
      void endSession().catch(() => {
        // Ignore shutdown errors during navigation.
      });
    };
  }, [endSession, startSession]);

  useEffect(() => {
    if (session.connectionState !== ConnectionState.Disconnected || !startedRef.current) {
      return;
    }

    removeSessionLaunchSnapshot(roomName);
    resetGoalProgress(roomName);
    resetObservations(roomName);
    startTransition(() => {
      void navigate({ replace: true, to: "/history" });
    });
  }, [navigate, roomName, session.connectionState]);

  if (startError) {
    return <PageState description={startError} title="Could not start the voice session" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <AgentSessionProvider session={session}>
        <SessionPacketBridge room={session.room} roomName={roomName} snapshot={snapshot} />
        <SessionCenter roomName={roomName} />
        {snapshot.sessionType === "role-play" && snapshot.scenario ? (
          <MissionSidebar
            roomName={roomName}
            scenario={snapshot.scenario}
            selectedCharacterIndex={snapshot.selectedCharacterIndex}
          />
        ) : (
          <ObservationsSidebar contextDocument={snapshot.contextDocument} roomName={roomName} />
        )}
      </AgentSessionProvider>
    </div>
  );
}

export function SessionPage() {
  const { roomName } = useParams({ from: "/session/$roomName" });
  const snapshot = getSessionLaunchSnapshot(roomName);

  if (!snapshot) {
    return (
      <AuthGate>
        <PageState
          description="The room launch snapshot is missing. Start a new practice session from a scenario or history page."
          title="Session context not found"
        />
      </AuthGate>
    );
  }

  if (!liveKitUrl) {
    return (
      <AuthGate>
        <PageState
          description="Set VITE_LIVEKIT_URL for the web app so the client can connect to the room URL that matches the minted token."
          title="LiveKit URL is not configured"
        />
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <SessionExperience roomName={roomName} serverUrl={liveKitUrl} snapshot={snapshot} />
    </AuthGate>
  );
}
