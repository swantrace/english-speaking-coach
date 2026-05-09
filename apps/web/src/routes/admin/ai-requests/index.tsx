import { ArrowLeft, Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import {
  normalizeAdminAiRequestSearch,
  parseAdminAiRequestSearch,
} from "@/features/admin/ai-requests/ai-request-search";
import { AiRequestStats } from "@/features/admin/ai-requests/ai-request-stats";
import { AiRequestsTable } from "@/features/admin/ai-requests/ai-requests-table";
import { getAdminAiRequestsPageSize } from "@/features/admin/ai-requests/api";
import { useAdminAiRequestStatsQuery, useAdminAiRequestsQuery } from "@/features/admin/ai-requests/queries";

export const Route = createFileRoute("/admin/ai-requests/")({
  validateSearch: parseAdminAiRequestSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const normalizedSearch = useMemo(() => normalizeAdminAiRequestSearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const queryFilters = {
    ...normalizedSearch,
    pageSize: getAdminAiRequestsPageSize(),
  };
  const requestsQuery = useAdminAiRequestsQuery(queryFilters);
  const statsQuery = useAdminAiRequestStatsQuery(queryFilters);

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
        search: () =>
          normalizeAdminAiRequestSearch({
            ...normalizedSearch,
            page: 1,
            search: nextSearch,
          }),
        to: "/admin/ai-requests",
      });
    });
  }, [deferredSearchValue, navigate, normalizedSearch]);

  function updateSearch(nextSearch: Partial<typeof normalizedSearch>) {
    startTransition(() => {
      void navigate({
        replace: true,
        search: () =>
          normalizeAdminAiRequestSearch({
            ...normalizedSearch,
            ...nextSearch,
            page: nextSearch.page ?? 1,
            search: nextSearch.search ?? (searchValue.trim() || undefined),
          }),
        to: "/admin/ai-requests",
      });
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link to="/admin">
              <ArrowLeft />
              Back to overview
            </Link>
          </Button>
        }
        description="Inspect model input/output pairs, token usage, latency, and failures across backend AI workflows."
        eyebrow="Admin Monitoring"
        title="AI requests"
      />

      {statsQuery.isPending ? (
        <LoadingState description="We’re calculating token usage and request totals." title="Loading AI usage" />
      ) : null}

      {statsQuery.isError ? (
        <ErrorState
          description={
            statsQuery.error instanceof Error ? statsQuery.error.message : "AI request stats are unavailable right now."
          }
          onRetry={() => void statsQuery.refetch()}
          title="Could not load AI usage"
        />
      ) : null}

      {statsQuery.isSuccess ? (
        <PageSection
          description="Summary values are based on normalized token columns, with raw usage preserved on each detail page."
          title="Token usage"
        >
          <AiRequestStats stats={statsQuery.data} />
        </PageSection>
      ) : null}

      {requestsQuery.isPending ? (
        <PageSection description="We’re loading the latest model request log." title="Requests">
          <DataTableSkeleton columnCount={7} />
        </PageSection>
      ) : null}

      {requestsQuery.isError ? (
        <ErrorState
          description={
            requestsQuery.error instanceof Error
              ? requestsQuery.error.message
              : "The AI request list is unavailable right now."
          }
          onRetry={() => void requestsQuery.refetch()}
          title="Could not load AI requests"
        />
      ) : null}

      {requestsQuery.isSuccess ? (
        <PageSection
          description={`${requestsQuery.data.total.toLocaleString()} request${
            requestsQuery.data.total === 1 ? "" : "s"
          } found.`}
          title="Request explorer"
        >
          <AiRequestsTable
            isPending={requestsQuery.isFetching}
            items={requestsQuery.data.items}
            onPageChange={(page) => updateSearch({ page })}
            onRowClick={(request) =>
              void navigate({
                params: { requestId: request.id },
                to: "/admin/ai-requests/$requestId",
              })
            }
            onSearchChange={setSearchValue}
            onStatusChange={(status) => updateSearch({ status })}
            page={requestsQuery.data.page}
            pageSize={requestsQuery.data.pageSize}
            searchValue={searchValue}
            status={normalizedSearch.status}
            total={requestsQuery.data.total}
            totalPages={requestsQuery.data.totalPages}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
