import { Button } from "@english-coach/ui";
import { TranscriptEntryList } from "../../components/agents-ui/agent-chat-transcript";
import type { TranscriptCue, TranscriptEntry } from "../../lib/agent-session-helpers";
import { Card, PageState } from "../../lib/app-shell";

export function HistoryTranscriptTab({
  activeTab,
  cuesById,
  hasRewrittenTranscript,
  onClearFocus,
  onSelectEntry,
  onToggleExpanded,
  selectedAnchorLabel,
  selectedEntryId,
  showAllTranscript,
  visibleEntries,
}: {
  activeTab: "transcript" | "rewritten";
  cuesById: Record<string, TranscriptCue[]>;
  hasRewrittenTranscript: boolean;
  onClearFocus?: () => void;
  onSelectEntry: (entry: TranscriptEntry) => void;
  onToggleExpanded: () => void;
  selectedAnchorLabel?: string;
  selectedEntryId?: string;
  showAllTranscript: boolean;
  visibleEntries: TranscriptEntry[];
}) {
  return (
    <Card className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl text-white">{activeTab === "rewritten" ? "Rewritten transcript" : "Transcript"}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {onClearFocus ? (
            <Button onClick={onClearFocus} variant="ghost">
              Clear turn focus
            </Button>
          ) : null}
          <Button onClick={onToggleExpanded} variant="outline">
            {showAllTranscript ? "Show latest turns" : "Expand full transcript"}
          </Button>
        </div>
      </div>
      <p className="text-sm leading-7 text-slate-300">
        {activeTab === "rewritten"
          ? "Learner turns are rewritten from the stored post-session corrections while agent turns remain unchanged."
          : "Stored transcript annotations replay against their original turn anchors when available."}
      </p>
      {selectedAnchorLabel ? (
        <div className="rounded-[18px] border border-orange-300/20 bg-orange-300/10 px-4 py-3 text-sm text-orange-50">
          Focused on {selectedAnchorLabel}.
        </div>
      ) : null}
      {activeTab === "rewritten" && !hasRewrittenTranscript ? (
        <PageState
          description="The post-session analysis has not produced a rewritten learner transcript yet."
          title="No rewritten transcript yet"
        />
      ) : (
        <TranscriptEntryList
          cuesById={cuesById}
          entries={visibleEntries}
          onSelectEntry={onSelectEntry}
          selectedEntryId={selectedEntryId}
        />
      )}
    </Card>
  );
}
