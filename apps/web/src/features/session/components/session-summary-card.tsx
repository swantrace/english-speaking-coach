import { Badge } from "@english-coach/ui";
import { MetricCard } from "@/components/app/metric-card";
import { PageSection } from "@/components/app/page-section";
import { RichContentViewer } from "@/components/app/rich-content-viewer";
import { stripRichTextToPlainText } from "../mappers";
import type { SessionHistoryDetailView } from "../types";

interface SessionSummaryCardProps {
  session: SessionHistoryDetailView;
}

export function SessionSummaryCard({ session }: SessionSummaryCardProps) {
  const plainContext = session.contextDocument ? stripRichTextToPlainText(session.contextDocument) : null;
  const analysisStatus = session.processing?.analysisStatus;
  const analysisPending = analysisStatus === "queued" || analysisStatus === "processing";
  const analysisFailed = analysisStatus === "failed";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Transcript turns" value={session.summary.transcriptTurnsCount.toLocaleString()} />
        <MetricCard label="Knowledge items" value={session.summary.knowledgeItemsCount.toLocaleString()} />
        <MetricCard label="Errors reviewed" value={session.summary.errorsCount.toLocaleString()} />
        <MetricCard label="Goals completed" value={session.summary.completedGoalsCount.toLocaleString()} />
      </div>

      <PageSection
        className="rounded-[0.25rem] border border-stone-200 bg-white p-6 shadow-sm"
        description="This learner-facing summary comes from the completed session review payload and stays separate from raw persistence details."
        title="Performance summary"
      >
        {analysisPending ? (
          <p className="rounded-2xl bg-stone-50 px-4 py-5 text-sm leading-7 text-slate-600">
            Your language review is still being prepared. It will appear here automatically when ready.
          </p>
        ) : analysisFailed ? (
          <p className="rounded-2xl bg-red-50 px-4 py-5 text-sm leading-7 text-red-700">
            {session.processing?.analysisError ?? "The language review could not be completed."}
          </p>
        ) : (
          <RichContentViewer content={session.summary.reviewMarkdown} />
        )}
      </PageSection>

      {plainContext ? (
        <PageSection
          className="rounded-[0.25rem] border border-stone-200 bg-white p-6 shadow-sm"
          description="The Markdown context supplied when this free-form session started."
          title="Practice context"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Free-form context</Badge>
          </div>
          <RichContentViewer className="mt-4" content={session.contextDocument ?? ""} />
        </PageSection>
      ) : null}
    </div>
  );
}
