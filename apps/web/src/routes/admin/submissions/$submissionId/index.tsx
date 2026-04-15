import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { JobFilters } from "@/features/admin/jobs/job-filters";
import { normalizeAdminJobSearch, parseAdminJobSearch } from "@/features/admin/jobs/job-search";
import { JobsTable } from "@/features/admin/jobs/jobs-table";
import { useAdminSubmissionJobsQuery } from "@/features/admin/jobs/queries";
import { useJobStream } from "@/features/admin/jobs/use-job-stream";

export const Route = createFileRoute("/admin/submissions/$submissionId/")({
  validateSearch: parseAdminJobSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { submissionId } = Route.useParams();
  const search = Route.useSearch();
  const normalizedSearch = useMemo(() => normalizeAdminJobSearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const jobsQuery = useAdminSubmissionJobsQuery(submissionId, normalizedSearch);
  const { connectionState } = useJobStream(submissionId);

  useEffect(() => {
    setSearchValue(normalizedSearch.search ?? "");
  }, [normalizedSearch.search]);

  useEffect(() => {
    const nextSearch = deferredSearchValue.trim() || undefined;

    if (nextSearch === normalizedSearch.search) {
      return;
    }

    startTransition(() => {
      void navigate({
        params: { submissionId },
        replace: true,
        search: (current) =>
          normalizeAdminJobSearch({
            ...current,
            kind: normalizedSearch.kind,
            search: nextSearch,
            status: normalizedSearch.status,
          }),
        to: "/admin/submissions/$submissionId",
      });
    });
  }, [
    deferredSearchValue,
    navigate,
    normalizedSearch.kind,
    normalizedSearch.search,
    normalizedSearch.status,
    submissionId,
  ]);

  function updateSearch(nextSearch: Partial<typeof normalizedSearch>) {
    startTransition(() => {
      void navigate({
        params: { submissionId },
        replace: true,
        search: () =>
          normalizeAdminJobSearch({
            kind: nextSearch.kind ?? normalizedSearch.kind,
            search: nextSearch.search ?? (searchValue.trim() || undefined),
            status: nextSearch.status ?? normalizedSearch.status,
          }),
        to: "/admin/submissions/$submissionId",
      });
    });
  }

  const submission = jobsQuery.data?.submission;
  const submissionTitle = submission ? submission.id : submissionId;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/admin/submissions">Back to submissions</Link>
            </Button>
          </div>
        }
        description={`${submission?.kindLabel ?? "Submission"} jobs. Live stream status: ${connectionState}.`}
        eyebrow="Admin Monitoring"
        title={`Submission ${submissionTitle}`}
      />

      <JobFilters
        kind={normalizedSearch.kind}
        onClear={() => {
          setSearchValue("");
          updateSearch({
            kind: undefined,
            search: undefined,
            status: undefined,
          });
        }}
        onKindChange={(kind) => updateSearch({ kind })}
        onSearchChange={setSearchValue}
        onStatusChange={(status) => updateSearch({ status })}
        searchValue={searchValue}
        status={normalizedSearch.status}
      />

      {jobsQuery.isPending ? (
        <PageSection description="We’re loading the latest jobs for this submission." title="Jobs">
          <DataTableSkeleton columnCount={7} />
        </PageSection>
      ) : null}

      {jobsQuery.isError ? (
        <ErrorState
          description={
            jobsQuery.error instanceof Error ? jobsQuery.error.message : "The jobs for this submission are unavailable."
          }
          onRetry={() => void jobsQuery.refetch()}
          title="Could not load jobs"
        />
      ) : null}

      {jobsQuery.isSuccess ? (
        <PageSection
          description={`${jobsQuery.data.total.toLocaleString()} job${jobsQuery.data.total === 1 ? "" : "s"} found.`}
          title="Jobs"
        >
          <JobsTable
            items={jobsQuery.data.items}
            onRowClick={(job) =>
              void navigate({
                params: { jobId: job.jobId, submissionId },
                to: "/admin/submissions/$submissionId/jobs/$jobId",
              })
            }
          />
        </PageSection>
      ) : null}
    </div>
  );
}
