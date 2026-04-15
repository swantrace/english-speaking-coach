import { EmptyState } from "@/components/app/empty-state";
import type { KnowledgeSenseView } from "../types";
import { KnowledgeSenseCard } from "./knowledge-sense-card";

interface KnowledgeSensesListProps {
  senses: KnowledgeSenseView[];
}

export function KnowledgeSensesList({ senses }: KnowledgeSensesListProps) {
  if (senses.length === 0) {
    return (
      <EmptyState
        description="No learner-facing senses have been attached to this item yet, so this section stays empty for now."
        title="No senses available"
      />
    );
  }

  return (
    <div className="space-y-4">
      {senses.map((sense) => (
        <KnowledgeSenseCard key={`${sense.order}-${sense.meaningEn}`} sense={sense} />
      ))}
    </div>
  );
}
