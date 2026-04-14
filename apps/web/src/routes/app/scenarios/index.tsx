import { Button } from "@english-coach/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { ScenarioFilterBar } from "@/features/scenario/components/scenario-filter-bar";
import { ScenarioGrid } from "@/features/scenario/components/scenario-grid";
import { useStudentScenarioListQuery } from "@/features/scenario/queries";

export const Route = createFileRoute("/app/scenarios/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [searchValue, setSearchValue] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const deferredSearchValue = useDeferredValue(searchValue);
  const scenarioListQuery = useStudentScenarioListQuery({
    search: deferredSearchValue,
    tags: selectedTags,
  });

  function handleToggleTag(tag: string) {
    startTransition(() => {
      setSelectedTags((currentTags) =>
        currentTags.includes(tag)
          ? currentTags.filter((currentTag) => currentTag !== tag)
          : [...currentTags, tag].sort(),
      );
    });
  }

  function handleClearFilters() {
    startTransition(() => {
      setSearchValue("");
      setSelectedTags([]);
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        }
        description="Browse approved practice scenarios, narrow them by lightweight tags, and open the full brief before live role-play is wired in."
        eyebrow="Scenario Library"
        title="Role-play scenarios"
      />

      <ScenarioFilterBar
        availableTags={scenarioListQuery.data?.availableTags ?? []}
        onClearFilters={handleClearFilters}
        onSearchChange={setSearchValue}
        onToggleTag={handleToggleTag}
        searchValue={searchValue}
        selectedTags={selectedTags}
      />

      {scenarioListQuery.isPending ? (
        <LoadingState
          description="We’re loading approved learner scenarios and available tags."
          title="Loading scenarios"
        />
      ) : null}

      {scenarioListQuery.isError ? (
        <ErrorState
          description={
            scenarioListQuery.error instanceof Error
              ? scenarioListQuery.error.message
              : "Scenario browsing is unavailable right now."
          }
          onRetry={() => void scenarioListQuery.refetch()}
          title="Could not load scenarios"
        />
      ) : null}

      {scenarioListQuery.isSuccess && scenarioListQuery.data.items.length === 0 ? (
        <EmptyState
          description="Try changing the search text or clearing one of the selected tags. Only practice-eligible scenarios are shown in this student slice."
          title="No scenarios match these filters"
        />
      ) : null}

      {scenarioListQuery.isSuccess && scenarioListQuery.data.items.length > 0 ? (
        <PageSection
          description={`${scenarioListQuery.data.total.toLocaleString()} scenario${scenarioListQuery.data.total === 1 ? "" : "s"} ready for learner browsing.`}
          title="Available scenarios"
        >
          <ScenarioGrid items={scenarioListQuery.data.items} />
        </PageSection>
      ) : null}
    </div>
  );
}
