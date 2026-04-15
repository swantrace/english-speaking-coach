import { Badge, Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { formatDate } from "@/lib/dates";
import { formatSessionType, truncateText } from "@/lib/format";
import type { KnowledgeOccurrenceView } from "../types";

interface OccurrenceCardProps {
  occurrence: KnowledgeOccurrenceView;
}

export function OccurrenceCard({ occurrence }: OccurrenceCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{occurrence.sessionTitle}</Badge>
            <Badge variant="outline">{formatSessionType(occurrence.sessionType)}</Badge>
            <Badge variant="outline">{occurrence.transcriptTurnLabel}</Badge>
            <Badge variant="outline">{formatDate(occurrence.occurredAt)}</Badge>
          </div>

          <p className="text-sm leading-7 text-slate-700">{truncateText(occurrence.excerpt, 220)}</p>
        </div>

        <Button asChild size="sm" variant="outline">
          <Link params={{ sessionId: occurrence.sessionId }} to="/app/sessions/$sessionId">
            Open session detail
          </Link>
        </Button>
      </div>
    </article>
  );
}
