import { createFileRoute } from "@tanstack/react-router";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { JobDetailHeader } from "@/features/admin/jobs/job-detail-header";
import { JobDetailSections } from "@/features/admin/jobs/job-detail-sections";
import { useAdminSubmissionJobDetailQuery } from "@/features/admin/jobs/queries";
import { useJobStream } from "@/features/admin/jobs/use-job-stream";

export const Route = createFileRoute("/admin/submissions/$submissionId/jobs/$jobId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { jobId, submissionId } = Route.useParams();
  const jobQuery = useAdminSubmissionJobDetailQuery(submissionId, jobId);
  const { connectionState } = useJobStream(submissionId);

  if (jobQuery.isPending) {
    return (
      <LoadingState
        description="We’re loading the latest input, output, and status metadata for this job."
        title="Loading job detail"
      />
    );
  }

  if (jobQuery.isError) {
    return (
      <ErrorState
        description={jobQuery.error instanceof Error ? jobQuery.error.message : "The job detail could not be loaded."}
        onRetry={() => void jobQuery.refetch()}
        title="Job detail unavailable"
      />
    );
  }

  return (
    <div className="space-y-8">
      <JobDetailHeader connectionState={connectionState} job={jobQuery.data} />
      <JobDetailSections job={jobQuery.data} />
    </div>
  );
}
