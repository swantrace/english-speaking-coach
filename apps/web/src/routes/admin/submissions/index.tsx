import { ArrowLeft, Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useAdminSubmissionsQuery } from "@/features/admin/submissions/queries";
import {
  normalizeAdminSubmissionSearch,
  parseAdminSubmissionSearch,
} from "@/features/admin/submissions/submission-search";
import { SubmissionsTable } from "@/features/admin/submissions/submissions-table";

export const Route = createFileRoute("/admin/submissions/")({
  validateSearch: parseAdminSubmissionSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const normalizedSearch = useMemo(() => normalizeAdminSubmissionSearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const submissionsQuery = useAdminSubmissionsQuery(normalizedSearch);

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
        replace: true,
        search: (current) =>
          normalizeAdminSubmissionSearch({
            ...current,
            kind: normalizedSearch.kind,
            search: nextSearch,
          }),
        to: "/admin/submissions",
      });
    });
  }, [deferredSearchValue, navigate, normalizedSearch.kind, normalizedSearch.search]);

  function updateSearch(nextSearch: Partial<typeof normalizedSearch>) {
    startTransition(() => {
      void navigate({
        replace: true,
        search: () =>
          normalizeAdminSubmissionSearch({
            kind: nextSearch.kind ?? normalizedSearch.kind,
            search: nextSearch.search ?? (searchValue.trim() || undefined),
          }),
        to: "/admin/submissions",
      });
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/admin">
                <ArrowLeft />
                Back to overview
              </Link>
            </Button>
          </div>
        }
        description="Monitor bulk generation and session analysis submissions, then open each submission to inspect the jobs running underneath it."
        eyebrow="Admin Monitoring"
        title="Submissions"
      />

      {submissionsQuery.isPending ? (
        <PageSection description="We’re loading the latest admin submission activity." title="Submissions">
          <DataTableSkeleton columnCount={5} />
        </PageSection>
      ) : null}

      {submissionsQuery.isError ? (
        <ErrorState
          description={
            submissionsQuery.error instanceof Error
              ? submissionsQuery.error.message
              : "The admin submissions feed is unavailable right now."
          }
          onRetry={() => void submissionsQuery.refetch()}
          title="Could not load submissions"
        />
      ) : null}

      {submissionsQuery.isSuccess ? (
        <PageSection
          description={`${submissionsQuery.data.total.toLocaleString()} submission${
            submissionsQuery.data.total === 1 ? "" : "s"
          } found.`}
          title="Submissions"
        >
          <SubmissionsTable
            items={submissionsQuery.data.items}
            kind={normalizedSearch.kind}
            onKindChange={(kind) => updateSearch({ kind })}
            onRowClick={(submission) =>
              void navigate({
                params: { submissionId: submission.id },
                to: "/admin/submissions/$submissionId",
              })
            }
            onSearchChange={setSearchValue}
            searchValue={searchValue}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
