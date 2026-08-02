import { isSessionProcessingTerminal, type SessionProcessingSnapshot } from "@english-coach/contract/session";
import { Badge, cn } from "@english-coach/ui";
import type { SessionProcessingConnectionState } from "../use-session-processing-stream";

type ProcessingStatus = SessionProcessingSnapshot["analysisStatus"];

const statusLabels: Record<ProcessingStatus, string> = {
  failed: "Failed",
  not_applicable: "Not applicable",
  processing: "Processing",
  queued: "Queued",
  ready: "Ready",
};

const statusClassNames: Record<ProcessingStatus, string> = {
  failed: "border-red-200 bg-red-50 text-red-800 hover:bg-red-50",
  not_applicable: "border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-50",
  processing: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50",
  queued: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
};

interface SessionProcessingPanelProps {
  connectionState: SessionProcessingConnectionState;
  processing: SessionProcessingSnapshot | null;
}

function getConnectionMessage(connectionState: SessionProcessingConnectionState) {
  switch (connectionState) {
    case "connecting":
      return "Connecting for live updates…";
    case "open":
      return "New results will appear automatically.";
    case "error":
      return "Live updates disconnected; reconnecting automatically…";
    case "idle":
      return "Waiting for processing to begin…";
    case "closed":
      return "All available processing stages have finished.";
  }
}

export function SessionProcessingPanel({ connectionState, processing }: SessionProcessingPanelProps) {
  if (!processing) {
    return (
      <section aria-live="polite" className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-5">
        <h2 className="text-lg text-slate-950">Preparing session results</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{getConnectionMessage(connectionState)}</p>
      </section>
    );
  }

  const stages = [
    {
      error: processing.analysisError,
      label: "Language review and errors",
      status: processing.analysisStatus,
    },
    {
      error: processing.rewrittenTranscriptError,
      label: "Refined role-play transcript",
      status: processing.rewrittenTranscriptStatus,
    },
    {
      error: processing.dialogueAudioError,
      label: "Corrected dialogue audio",
      status: processing.dialogueAudioStatus,
    },
    {
      error: processing.knowledgeError,
      label: "Knowledge extraction",
      status: processing.knowledgeStatus,
    },
  ].filter((stage) => stage.status !== "not_applicable");
  const terminal = isSessionProcessingTerminal(processing);

  return (
    <section aria-live="polite" className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg text-slate-950">Session results</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Each result becomes available independently, so completed sections do not wait for later work.
          </p>
        </div>
        <p className={cn("text-xs leading-5", connectionState === "error" ? "text-red-700" : "text-slate-500")}>
          {terminal ? "Processing finished." : getConnectionMessage(connectionState)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {stages.map((stage) => (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3" key={stage.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">{stage.label}</p>
              <Badge className={statusClassNames[stage.status]} variant="outline">
                {statusLabels[stage.status]}
              </Badge>
            </div>
            {stage.error ? <p className="mt-2 text-xs leading-5 text-red-700">{stage.error}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
