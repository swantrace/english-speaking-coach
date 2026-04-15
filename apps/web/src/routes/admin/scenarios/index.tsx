import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { normalizeAdminScenarioSearch, parseAdminScenarioSearch } from "@/features/scenario/admin-scenario-search";
import { AdminScenarioFilters } from "@/features/scenario/components/admin-scenario-filters";
import { AdminScenariosTable } from "@/features/scenario/components/admin-scenarios-table";
import { useAdminScenarioListQuery } from "@/features/scenario/queries";

export const Route = createFileRoute("/admin/scenarios/")({
  validateSearch: parseAdminScenarioSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const normalizedSearch = useMemo(() => normalizeAdminScenarioSearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const scenarioQuery = useAdminScenarioListQuery(normalizedSearch);

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
          normalizeAdminScenarioSearch({
            ...current,
            reviewStatus: normalizedSearch.reviewStatus,
            search: nextSearch,
            tags: normalizedSearch.tags,
          }),
        to: "/admin/scenarios",
      });
    });
  }, [deferredSearchValue, navigate, normalizedSearch.reviewStatus, normalizedSearch.search, normalizedSearch.tags]);

  function updateSearch(nextSearch: Partial<typeof normalizedSearch>) {
    startTransition(() => {
      void navigate({
        replace: true,
        search: () =>
          normalizeAdminScenarioSearch({
            reviewStatus: nextSearch.reviewStatus ?? normalizedSearch.reviewStatus,
            search: nextSearch.search ?? (searchValue.trim() || undefined),
            tags: nextSearch.tags ?? normalizedSearch.tags,
          }),
        to: "/admin/scenarios",
      });
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/admin">Back to overview</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/scenarios/bulk">Bulk generate</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/scenarios/new">New scenario</Link>
            </Button>
          </div>
        }
        description="Browse the full admin scenario inventory, filter by review state or tags, and take row-level or bulk actions."
        eyebrow="Admin Scenarios"
        title="Scenario management"
      />

      <AdminScenarioFilters
        availableTags={scenarioQuery.data?.availableTags ?? []}
        onClear={() => {
          setSearchValue("");
          updateSearch({
            reviewStatus: undefined,
            search: undefined,
            tags: [],
          });
        }}
        onReviewStatusChange={(reviewStatus) =>
          updateSearch({
            reviewStatus,
            search: searchValue.trim() || undefined,
            tags: normalizedSearch.tags,
          })
        }
        onSearchChange={setSearchValue}
        onTagToggle={(tag) =>
          updateSearch({
            reviewStatus: normalizedSearch.reviewStatus,
            search: searchValue.trim() || undefined,
            tags: normalizedSearch.tags.includes(tag)
              ? normalizedSearch.tags.filter((currentTag) => currentTag !== tag)
              : [...normalizedSearch.tags, tag],
          })
        }
        reviewStatus={normalizedSearch.reviewStatus}
        searchValue={searchValue}
        selectedTags={normalizedSearch.tags}
      />

      {scenarioQuery.isPending ? (
        <PageSection
          description="We’re loading the latest admin scenario inventory with your current filters."
          title="Scenarios"
        >
          <DataTableSkeleton columnCount={7} />
        </PageSection>
      ) : null}

      {scenarioQuery.isError ? (
        <ErrorState
          description={
            scenarioQuery.error instanceof Error
              ? scenarioQuery.error.message
              : "The admin scenario inventory is unavailable right now."
          }
          onRetry={() => void scenarioQuery.refetch()}
          title="Could not load scenarios"
        />
      ) : null}

      {scenarioQuery.isSuccess ? (
        <PageSection
          description={`${scenarioQuery.data.total.toLocaleString()} scenario${
            scenarioQuery.data.total === 1 ? "" : "s"
          } found.`}
          title="Scenarios"
        >
          <AdminScenariosTable items={scenarioQuery.data.items} />
        </PageSection>
      ) : null}
    </div>
  );
}
