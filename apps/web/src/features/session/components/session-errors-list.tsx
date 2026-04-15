import { Badge } from "@english-coach/ui";
import { EmptyState } from "@/components/app/empty-state";
import type { SessionReviewErrorView } from "../types";

interface SessionErrorsListProps {
  errors: SessionReviewErrorView[];
}

export function SessionErrorsList({ errors }: SessionErrorsListProps) {
  if (errors.length === 0) {
    return (
      <EmptyState
        description="No reviewed learner errors were attached to this session, so there is nothing to inspect here."
        title="No errors recorded"
      />
    );
  }

  return (
    <div className="space-y-4">
      {errors.map((error) => (
        <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm" key={error.id}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{error.dimension}</Badge>
            {error.transcriptTurnLabel ? <Badge variant="secondary">{error.transcriptTurnLabel}</Badge> : null}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Issue</p>
              <p className="mt-1 text-sm leading-7 text-slate-800">{error.description}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Utterance</p>
              <p className="mt-1 rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-7 text-slate-700">
                {error.utterance}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Suggestion</p>
              <p className="mt-1 text-sm leading-7 text-slate-700">{error.suggestion}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
