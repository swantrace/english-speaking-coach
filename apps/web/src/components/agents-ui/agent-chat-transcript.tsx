import type { AgentState, ReceivedMessage } from "@livekit/components-react";
import { formatAgentStateLabel, getTranscriptEntries } from "../../lib/agent-session-helpers";

export function AgentChatTranscript({
  agentState,
  className = "",
  messages,
}: {
  agentState?: AgentState;
  className?: string;
  messages: ReceivedMessage[];
}) {
  const transcriptEntries = getTranscriptEntries(messages);

  return (
    <div className={`grid gap-3 ${className}`}>
      {transcriptEntries.length ? (
        transcriptEntries.map((entry) => (
          <div
            className={`rounded-[18px] border px-4 py-3 ${
              entry.speaker === "user" ? "border-cyan-300/15 bg-cyan-300/10" : "border-white/10 bg-white/[0.04]"
            }`}
            key={entry.id}
          >
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
              <span>{entry.speaker}</span>
              {entry.timestamp ? <span>{entry.timestamp.toLocaleTimeString()}</span> : null}
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-100">{entry.message}</p>
          </div>
        ))
      ) : (
        <div className="rounded-[18px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
          Transcript items will appear here once the session starts receiving messages.
        </div>
      )}

      {agentState === "thinking" ? (
        <div className="rounded-[18px] border border-orange-300/15 bg-orange-300/10 px-4 py-3 text-sm text-orange-50">
          Agent is {formatAgentStateLabel(agentState)}...
        </div>
      ) : null}
    </div>
  );
}
