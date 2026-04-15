import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { OccurrenceFilters } from "@/features/admin/occurrences/occurrence-filters";
import { normalizeOccurrenceSearch, parseOccurrenceSearch } from "@/features/admin/occurrences/occurrence-search";
import { OccurrenceTable } from "@/features/admin/occurrences/occurrence-table";
import { useAdminOccurrenceListQuery } from "@/features/admin/occurrences/queries";

export const Route = createFileRoute("/admin/occurrences/")({
  component: RouteComponent,
  validateSearch: parseOccurrenceSearch,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const normalizedSearch = useMemo(() => normalizeOccurrenceSearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const occurrenceQuery = useAdminOccurrenceListQuery(normalizedSearch);

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
          normalizeOccurrenceSearch({
            ...current,
            search: nextSearch,
            status: normalizedSearch.status,
          }),
        to: "/admin/occurrences",
      });
    });
  }, [deferredSearchValue, navigate, normalizedSearch.search, normalizedSearch.status]);

  function updateSearch(nextSearch: Partial<typeof normalizedSearch>) {
    startTransition(() => {
      void navigate({
        replace: true,
        search: () =>
          normalizeOccurrenceSearch({
            search: nextSearch.search ?? (searchValue.trim() || undefined),
            status: nextSearch.status ?? normalizedSearch.status,
          }),
        to: "/admin/occurrences",
      });
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/knowledge">Back to knowledge</Link>
          </Button>
        }
        description="Review proposed knowledge occurrences from practice sessions and resolve each one by linking, drafting, or rejecting."
        eyebrow="Admin Occurrences"
        title="Occurrence review"
      />

      <OccurrenceFilters
        onClear={() => {
          setSearchValue("");
          updateSearch({
            search: undefined,
            status: "proposed",
          });
        }}
        onSearchChange={setSearchValue}
        onStatusChange={(status) => updateSearch({ status })}
        searchValue={searchValue}
        status={normalizedSearch.status}
      />

      {occurrenceQuery.isPending ? (
        <PageSection
          description="We’re loading the current occurrence review queue with your selected filters."
          title="Occurrences"
        >
          <DataTableSkeleton columnCount={5} />
        </PageSection>
      ) : null}

      {occurrenceQuery.isError ? (
        <ErrorState
          description={
            occurrenceQuery.error instanceof Error
              ? occurrenceQuery.error.message
              : "The occurrence review queue is unavailable right now."
          }
          onRetry={() => void occurrenceQuery.refetch()}
          title="Could not load occurrences"
        />
      ) : null}

      {occurrenceQuery.isSuccess ? (
        <PageSection
          description={`${occurrenceQuery.data.total.toLocaleString()} occurrence${
            occurrenceQuery.data.total === 1 ? "" : "s"
          } found.`}
          title="Occurrences"
        >
          <OccurrenceTable items={occurrenceQuery.data.items} />
        </PageSection>
      ) : null}
    </div>
  );
}
