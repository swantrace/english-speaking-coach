import { EmptyState } from "@/components/app/empty-state";
import type { SessionTranscriptReviewTurn } from "../types";
import { type TranscriptMode, TranscriptModeToggle } from "./transcript-mode-toggle";
import { TranscriptTurn } from "./transcript-turn";

interface TranscriptViewerProps {
  canToggleMode: boolean;
  mode: TranscriptMode;
  onModeChange: (mode: TranscriptMode) => void;
  turns: SessionTranscriptReviewTurn[];
}

export function TranscriptViewer({ canToggleMode, mode, onModeChange, turns }: TranscriptViewerProps) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,236,0.92))] p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Transcript Review</p>
          <h2 className="mt-2 text-xl text-slate-950">
            {mode === "refined" ? "Refined transcript" : "Original transcript"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Read through the finished exchange turn by turn. When a role-play refinement is available, you can compare
            the original wording with the revised version.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-600">{turns.length} turns</p>
          {canToggleMode ? <TranscriptModeToggle mode={mode} onModeChange={onModeChange} /> : null}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {turns.length === 0 ? (
          <EmptyState
            description="This session has no saved transcript turns yet, so there is nothing to review here."
            title="Transcript unavailable"
          />
        ) : (
          turns.map((turn) => <TranscriptTurn key={turn.id} turn={turn} />)
        )}
      </div>
    </section>
  );
}
