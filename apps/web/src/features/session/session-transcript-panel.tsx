import type { AgentState, ReceivedMessage } from "@livekit/components-react";
import { useMemo } from "react";
import { AgentChatTranscript } from "../../components/agents-ui/agent-chat-transcript";
import { createTranscriptCueMap, getTranscriptEntries } from "../../lib/agent-session-helpers";
import { Card } from "../../lib/app-shell";
import { useGoalProgress, useObservations } from "../../lib/livekit-packet-stores";
import { getSessionLaunchSnapshot } from "../../lib/session-launch-store";

export function SessionTranscriptPanel({
  agentState,
  messages,
  roomName,
}: {
  agentState?: AgentState;
  messages: ReceivedMessage[];
  roomName: string;
}) {
  const snapshot = getSessionLaunchSnapshot(roomName);
  const goalProgress = useGoalProgress(roomName);
  const observations = useObservations(roomName);
  const transcriptEntries = useMemo(() => getTranscriptEntries(messages), [messages]);
  const cuesById = useMemo(
    () =>
      createTranscriptCueMap({
        entries: transcriptEntries,
        goalProgress: snapshot?.sessionType === "role-play" ? goalProgress : null,
        observations: snapshot?.sessionType === "free-form" ? observations.items : [],
      }),
    [goalProgress, observations.items, snapshot?.sessionType, transcriptEntries],
  );

  return (
    <Card className="grid gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="text-lg text-slate-950">Live transcript</h2>
          <p className="text-sm text-slate-600">
            Transcript turns stay primary. Role-play progress and free-form prompts appear as lighter helper text
            beneath the relevant learner turns.
          </p>
        </div>
        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Session messages API</span>
      </div>
      <div className="max-h-[42rem] overflow-auto pr-1">
        <AgentChatTranscript agentState={agentState} cuesById={cuesById} messages={messages} />
      </div>
    </Card>
  );
}
