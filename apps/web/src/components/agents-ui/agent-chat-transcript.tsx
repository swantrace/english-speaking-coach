import type { AgentState, ReceivedMessage } from "@livekit/components-react";
import {
  formatAgentStateLabel,
  getTranscriptEntries,
  type TranscriptCue,
  type TranscriptEntry,
} from "../../lib/agent-session-helpers";

function cueToneClasses(kind: TranscriptCue["kind"]) {
  if (kind === "goal-progress") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-50";
  }

  return "border-emerald-300/15 bg-emerald-300/10 text-emerald-50/90";
}

export function TranscriptEntryList({
  agentState,
  className = "",
  cuesById,
  entries,
  onSelectEntry,
  selectedEntryId,
}: {
  agentState?: AgentState;
  className?: string;
  cuesById?: Record<string, TranscriptCue[]>;
  entries: TranscriptEntry[];
  onSelectEntry?: (entry: TranscriptEntry) => void;
  selectedEntryId?: string;
}) {
  const transcriptEntries = entries;

  return (
    <div className={`grid gap-3 ${className}`}>
      {transcriptEntries.length ? (
        transcriptEntries.map((entry) => (
          <div
            className={`rounded-[18px] border px-4 py-3 transition ${
              entry.speaker === "user" ? "border-cyan-300/15 bg-cyan-300/10" : "border-white/10 bg-white/[0.04]"
            } ${selectedEntryId === entry.id ? "ring-2 ring-orange-300/50" : ""}`}
            id={entry.id}
            key={entry.id}
          >
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
              <span>{entry.speaker}</span>
              <div className="flex items-center gap-3">
                <span>Turn {entry.turnIndex + 1}</span>
                {entry.timestamp ? <span>{entry.timestamp.toLocaleTimeString()}</span> : null}
              </div>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-100">{entry.message}</p>
            {onSelectEntry ? (
              <button
                className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400 transition hover:text-orange-100"
                onClick={() => onSelectEntry(entry)}
                type="button"
              >
                Focus this turn
              </button>
            ) : null}
            {cuesById?.[entry.id]?.length ? (
              <div className="mt-3 grid gap-2">
                {cuesById[entry.id].map((cue) => (
                  <div
                    className={`rounded-[14px] border px-3 py-2 text-xs leading-6 ${cueToneClasses(cue.kind)}`}
                    key={`${entry.id}:${cue.kind}:${cue.text}`}
                  >
                    {cue.text}
                  </div>
                ))}
              </div>
            ) : null}
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

export function AgentChatTranscript({
  agentState,
  className = "",
  cuesById,
  messages,
}: {
  agentState?: AgentState;
  className?: string;
  cuesById?: Record<string, TranscriptCue[]>;
  messages: ReceivedMessage[];
}) {
  return (
    <TranscriptEntryList
      agentState={agentState}
      className={className}
      cuesById={cuesById}
      entries={getTranscriptEntries(messages)}
    />
  );
}
