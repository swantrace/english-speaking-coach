import { Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { KeyValueGrid } from "@/components/app/key-value-grid";
import { PageSection } from "@/components/app/page-section";
import { JobJsonView } from "./job-json-view";
import { JobStatusChip } from "./job-status-chip";
import type { AdminJobDetailView } from "./types";

interface JobDetailSectionsProps {
  job: AdminJobDetailView;
}

export function JobDetailSections({ job }: JobDetailSectionsProps) {
  const relatedActions = [job.relatedLinks.session, job.relatedLinks.scenario, job.relatedLinks.knowledge].filter(
    Boolean,
  );

  return (
    <div className="space-y-8">
      <PageSection
        description="Track the current state of the job without dropping into raw persistence details."
        title="Overview"
      >
        <div className="space-y-4">
          <JobStatusChip progress={job.progress} progressLabel={job.progressLabel} status={job.status} />
          <KeyValueGrid
            columns={4}
            items={[
              { label: "Submission ID", value: <span className="font-mono text-xs">{job.submissionId}</span> },
              { label: "Queued", value: job.queuedAtLabel },
              { label: "Processed", value: job.processedAtLabel },
              { label: "Kind", value: job.kindLabel },
            ]}
          />
          <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Message</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{job.message ?? "No status message was recorded."}</p>
          </div>
        </div>
      </PageSection>

      {job.error ? (
        <PageSection description="The latest job failure is shown verbatim for debugging." title="Error">
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="font-mono text-sm leading-6 text-red-900">{job.error}</p>
          </div>
        </PageSection>
      ) : null}

      {job.submission ? (
        <PageSection
          description="Submission metadata helps place this job back in its parent workflow."
          title="Submission"
        >
          <KeyValueGrid
            columns={4}
            items={[
              { label: "Submission ID", value: <span className="font-mono text-xs">{job.submission.id}</span> },
              { label: "Kind", value: job.submission.kindLabel },
              { label: "Created", value: job.submission.createdAtLabel },
              { label: "Updated", value: job.submission.updatedAtLabel },
            ]}
          />
        </PageSection>
      ) : null}

      {relatedActions.length > 0 ? (
        <PageSection description="Jump straight to the record created or analyzed by this job." title="Related records">
          <div className="flex flex-wrap gap-3">
            {job.relatedLinks.session ? (
              <Button asChild variant="outline">
                <Link params={job.relatedLinks.session.params} to={job.relatedLinks.session.to}>
                  {job.relatedLinks.session.label}
                </Link>
              </Button>
            ) : null}
            {job.relatedLinks.scenario ? (
              <Button asChild variant="outline">
                <Link params={job.relatedLinks.scenario.params} to={job.relatedLinks.scenario.to}>
                  {job.relatedLinks.scenario.label}
                </Link>
              </Button>
            ) : null}
            {job.relatedLinks.knowledge ? (
              <Button asChild variant="outline">
                <Link params={job.relatedLinks.knowledge.params} to={job.relatedLinks.knowledge.to}>
                  {job.relatedLinks.knowledge.label}
                </Link>
              </Button>
            ) : null}
          </div>
        </PageSection>
      ) : null}

      <PageSection
        description="Input payloads stay readable, but the raw structure is preserved for debugging."
        title="Input"
      >
        <JobJsonView
          emptyMessage="No input payload was recorded for this job."
          title="Input payload"
          value={job.input}
        />
      </PageSection>

      <PageSection
        description="Completed jobs expose the latest output payload without assuming any specific sub-shape."
        title="Output"
      >
        <JobJsonView
          emptyMessage="No output payload is available yet for this job."
          title="Output payload"
          value={job.output}
        />
      </PageSection>
    </div>
  );
}
