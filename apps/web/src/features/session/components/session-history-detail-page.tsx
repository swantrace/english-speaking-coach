import { useState } from "react";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageSection } from "@/components/app/page-section";
import { useSessionHistoryDetailQuery } from "../queries";
import { SessionDetailHeader } from "./session-detail-header";
import { SessionErrorsList } from "./session-errors-list";
import { SessionKnowledgeList } from "./session-knowledge-list";
import { SessionSummaryCard } from "./session-summary-card";
import type { TranscriptMode } from "./transcript-mode-toggle";
import { TranscriptViewer } from "./transcript-viewer";

interface SessionHistoryDetailPageProps {
  sessionId: string;
}

export function SessionHistoryDetailPage({ sessionId }: SessionHistoryDetailPageProps) {
  const [transcriptMode, setTranscriptMode] = useState<TranscriptMode>("original");
  const sessionDetailQuery = useSessionHistoryDetailQuery(sessionId);

  if (sessionDetailQuery.isPending) {
    return (
      <LoadingState
        description="We’re loading the transcript, summary, and linked review data for this session."
        title="Loading session review"
      />
    );
  }

  if (sessionDetailQuery.isError) {
    return (
      <ErrorState
        description={
          sessionDetailQuery.error instanceof Error
            ? sessionDetailQuery.error.message
            : "Session review data could not be loaded."
        }
        onRetry={() => void sessionDetailQuery.refetch()}
        title="Session detail unavailable"
      />
    );
  }

  const session = sessionDetailQuery.data;
  const canToggleTranscript = session.sessionType === "role-play" && Boolean(session.refinedTranscript);
  const transcriptTurns =
    transcriptMode === "refined" && canToggleTranscript && session.refinedTranscript
      ? session.refinedTranscript
      : session.originalTranscript;

  return (
    <div className="space-y-8">
      <SessionDetailHeader session={session} />

      <SessionSummaryCard session={session} />

      <PageSection
        description="The transcript stays learner-readable and switches into a refined comparison view only when a role-play rewrite is available."
        title="Transcript"
      >
        <TranscriptViewer
          canToggleMode={canToggleTranscript}
          mode={canToggleTranscript ? transcriptMode : "original"}
          onModeChange={setTranscriptMode}
          turns={transcriptTurns}
        />
      </PageSection>

      <PageSection
        description="Resolved knowledge items link onward to their dedicated learner detail pages."
        title="Knowledge items"
      >
        <SessionKnowledgeList items={session.knowledgeItems} />
      </PageSection>

      <PageSection
        description="Errors remain attached to the learner review summary when the backend could match them back to transcript turns."
        title="Errors"
      >
        <SessionErrorsList errors={session.errors} />
      </PageSection>
    </div>
  );
}
