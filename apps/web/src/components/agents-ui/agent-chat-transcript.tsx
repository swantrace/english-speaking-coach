import type { AgentState, ReceivedMessage } from "@livekit/components-react";
import {
  formatAgentStateLabel,
  getTranscriptEntries,
  type TranscriptCue,
  type TranscriptEntry,
} from "../../lib/agent-session-helpers";

function cueToneClasses(kind: TranscriptCue["kind"]) {
  if (kind === "goal-progress") {
    return "border-amber-300 bg-amber-100 text-amber-900";
  }

  return "border-emerald-300 bg-emerald-100 text-emerald-900";
}

function cueLabel(cue: TranscriptCue) {
  if (cue.kind === "goal-progress") {
    return "Mission";
  }

  switch (cue.coachingKind) {
    case "error_hint":
      return "Error hint";
    case "knowledge_hint":
      return "Knowledge hint";
    case "fluency_hint":
      return "Fluency hint";
    default:
      return "Coach prompt";
  }
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
              entry.speaker === "user" ? "border-cyan-300 bg-cyan-100" : "border-slate-200 bg-slate-50"
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
            <p className="mt-2 text-sm leading-7 text-slate-800">{entry.message}</p>
            {onSelectEntry ? (
              <button
                className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500 transition hover:text-amber-700"
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
                    <span className="mr-2 uppercase tracking-[0.14em] text-[10px] opacity-70">{cueLabel(cue)}</span>
                    {cue.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Transcript items will appear here once the session starts receiving messages.
        </div>
      )}

      {agentState === "thinking" ? (
        <div className="rounded-[18px] border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-900">
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
