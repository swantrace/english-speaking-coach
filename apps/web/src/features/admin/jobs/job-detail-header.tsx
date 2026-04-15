import { Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import type { AdminJobDetailView, JobStreamConnectionState } from "./types";

interface JobDetailHeaderProps {
  connectionState: JobStreamConnectionState;
  job: AdminJobDetailView;
}

function getConnectionLabel(connectionState: JobStreamConnectionState) {
  switch (connectionState) {
    case "closed":
      return "Stream offline";
    case "connecting":
      return "Connecting to live updates";
    case "error":
      return "Live updates interrupted";
    case "open":
      return "Live updates active";
  }
}

export function JobDetailHeader({ connectionState, job }: JobDetailHeaderProps) {
  return (
    <PageHeader
      actions={
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link params={{ submissionId: job.submissionId }} to="/admin/submissions/$submissionId">
              Back to jobs
            </Link>
          </Button>
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
      }
      description={`${job.kindLabel}. ${getConnectionLabel(connectionState)}.`}
      eyebrow="Admin Monitoring"
      title={`Job ${job.jobId}`}
    />
  );
}
