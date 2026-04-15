import { EmptyState } from "@/components/app/empty-state";
import type { KnowledgeOccurrenceView } from "../types";
import { OccurrenceCard } from "./occurrence-card";

interface OccurrencesListProps {
  occurrences: KnowledgeOccurrenceView[];
}

export function OccurrencesList({ occurrences }: OccurrencesListProps) {
  if (occurrences.length === 0) {
    return (
      <EmptyState
        description="No session-linked occurrences are available for this knowledge item yet."
        title="No occurrences available"
      />
    );
  }

  return (
    <div className="space-y-4">
      {occurrences.map((occurrence) => (
        <OccurrenceCard key={occurrence.id} occurrence={occurrence} />
      ))}
    </div>
  );
}
