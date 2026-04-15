import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageSection } from "@/components/app/page-section";
import { useKnowledgeDetailQuery } from "../queries";
import { KnowledgeDetailHeader } from "./knowledge-detail-header";
import { KnowledgeSensesList } from "./knowledge-senses-list";
import { KnowledgeSummaryCard } from "./knowledge-summary-card";
import { OccurrencesList } from "./occurrences-list";

interface KnowledgeDetailPageProps {
  knowledgeId: string;
}

export function KnowledgeDetailPage({ knowledgeId }: KnowledgeDetailPageProps) {
  const knowledgeDetailQuery = useKnowledgeDetailQuery(knowledgeId);

  if (knowledgeDetailQuery.isPending) {
    return (
      <LoadingState
        description="We’re loading the knowledge summary, attached senses, and linked session occurrences."
        title="Loading knowledge detail"
      />
    );
  }

  if (knowledgeDetailQuery.isError) {
    return (
      <ErrorState
        description={
          knowledgeDetailQuery.error instanceof Error
            ? knowledgeDetailQuery.error.message
            : "Knowledge detail could not be loaded."
        }
        onRetry={() => void knowledgeDetailQuery.refetch()}
        title="Knowledge detail unavailable"
      />
    );
  }

  const knowledge = knowledgeDetailQuery.data;

  return (
    <div className="space-y-8">
      <KnowledgeDetailHeader knowledge={knowledge} />

      <KnowledgeSummaryCard knowledge={knowledge} />

      <PageSection
        description="Each sense keeps the learner-facing meaning, bilingual gloss, and example usage visible in one place."
        title="Senses"
      >
        <KnowledgeSensesList senses={knowledge.senses} />
      </PageSection>

      <PageSection
        description="Occurrences link directly back to the session detail pages where this pattern appeared."
        title="Occurrences"
      >
        <OccurrencesList occurrences={knowledge.occurrences} />
      </PageSection>
    </div>
  );
}
