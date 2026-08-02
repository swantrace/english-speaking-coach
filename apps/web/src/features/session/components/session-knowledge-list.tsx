import type { SessionProcessingSnapshot } from "@english-coach/contract/session";
import { Badge, Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/empty-state";
import type { SessionKnowledgeItemView } from "../types";

interface SessionKnowledgeListProps {
  error?: string | null;
  items: SessionKnowledgeItemView[];
  status?: SessionProcessingSnapshot["knowledgeStatus"];
}

export function SessionKnowledgeList({ error, items, status }: SessionKnowledgeListProps) {
  if (items.length === 0) {
    if (status === "queued" || status === "processing") {
      return (
        <EmptyState
          description="Reusable language patterns are still being extracted and enriched. Results will appear automatically."
          title="Knowledge extraction in progress"
        />
      );
    }

    if (status === "failed") {
      return (
        <EmptyState description={error ?? "Knowledge extraction could not be completed."} title="Extraction failed" />
      );
    }

    return (
      <EmptyState
        description="No linked knowledge items were resolved for this session yet, so this section stays empty for now."
        title="No knowledge items linked"
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm" key={item.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{item.pattern}</Badge>
                <Badge variant="outline">
                  {item.count.toLocaleString()} occurrence{item.count === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline">{item.speaker === "user" ? "Learner usage" : "Coach usage"}</Badge>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Linked excerpts show where this knowledge item appeared in the reviewed transcript.
              </p>
            </div>

            <Button asChild size="sm" variant="outline">
              <Link params={{ knowledgeId: item.knowledgeItemId }} to="/app/knowledge/$knowledgeId">
                Open knowledge detail
              </Link>
            </Button>
          </div>

          {item.examples.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-500">Examples</p>
              <div className="flex flex-wrap gap-2">
                {item.examples.map((example) => (
                  <Badge className="rounded-full px-3 py-1 text-sm" key={example} variant="secondary">
                    {example}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {item.occurrences.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-500">Transcript references</p>
              {item.occurrences.map((occurrence) => (
                <div className="rounded-2xl bg-stone-50 px-4 py-3" key={occurrence.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{occurrence.transcriptTurnLabel}</Badge>
                    <Badge variant="outline">{occurrence.speaker === "user" ? "You" : "Coach"}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{occurrence.excerpt}</p>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
