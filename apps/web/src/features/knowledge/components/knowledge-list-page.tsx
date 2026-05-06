import { ArrowLeft, Button } from "@english-coach/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { type KnowledgeSearchParams, normalizeKnowledgeSearch } from "../knowledge-search";
import { filterKnowledgeListItems } from "../mappers";
import { useKnowledgeListQuery } from "../queries";
import { KnowledgeTable } from "./knowledge-table";

interface KnowledgeListPageProps {
  search: KnowledgeSearchParams;
}

export function KnowledgeListPage({ search }: KnowledgeListPageProps) {
  const navigate = useNavigate();
  const normalizedSearch = useMemo(() => normalizeKnowledgeSearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const knowledgeListQuery = useKnowledgeListQuery({
    search: normalizedSearch.search,
  });

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
        search: (current) => normalizeKnowledgeSearch({ ...current, search: nextSearch }),
        to: "/app/knowledge",
      });
    });
  }, [deferredSearchValue, navigate, normalizedSearch.search]);

  const filteredItems = useMemo(() => {
    if (!knowledgeListQuery.data) {
      return [];
    }

    return filterKnowledgeListItems(knowledgeListQuery.data.items, normalizedSearch);
  }, [knowledgeListQuery.data, normalizedSearch]);

  function updateSearch(nextSearch: KnowledgeSearchParams) {
    startTransition(() => {
      void navigate({
        replace: true,
        search: () => normalizeKnowledgeSearch(nextSearch),
        to: "/app/knowledge",
      });
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link to="/app">
              <ArrowLeft />
              Back to dashboard
            </Link>
          </Button>
        }
        description="Browse learner-visible knowledge items gathered from completed sessions, then open each item for senses and cross-session occurrences."
        eyebrow="Knowledge"
        title="Knowledge review"
      />

      {knowledgeListQuery.isPending ? (
        <LoadingState
          description="We’re loading the learner-facing knowledge inventory and applying your current search."
          title="Loading knowledge review"
        />
      ) : null}

      {knowledgeListQuery.isError ? (
        <ErrorState
          description={
            knowledgeListQuery.error instanceof Error
              ? knowledgeListQuery.error.message
              : "Knowledge review data is unavailable right now."
          }
          onRetry={() => void knowledgeListQuery.refetch()}
          title="Could not load knowledge review"
        />
      ) : null}

      {knowledgeListQuery.isSuccess && filteredItems.length === 0 ? (
        <EmptyState
          description="Try a broader search or clear one of the category filters. Only learner-visible knowledge items are shown here."
          title="No knowledge items match these filters"
        />
      ) : null}

      {knowledgeListQuery.isSuccess && filteredItems.length > 0 ? (
        <PageSection
          description={`${filteredItems.length.toLocaleString()} item${filteredItems.length === 1 ? "" : "s"} shown${filteredItems.length === knowledgeListQuery.data.total ? "" : ` out of ${knowledgeListQuery.data.total.toLocaleString()}`}.`}
          title="Learned patterns"
        >
          <KnowledgeTable
            communicativeFunction={normalizedSearch.communicativeFunction}
            fixednessLevel={normalizedSearch.fixednessLevel}
            items={filteredItems}
            onCommunicativeFunctionChange={(communicativeFunction) =>
              updateSearch({
                communicativeFunction,
                fixednessLevel: normalizedSearch.fixednessLevel,
                search: deferredSearchValue.trim() || undefined,
                patternType: normalizedSearch.patternType,
              })
            }
            onFixednessLevelChange={(fixednessLevel) =>
              updateSearch({
                communicativeFunction: normalizedSearch.communicativeFunction,
                fixednessLevel,
                search: deferredSearchValue.trim() || undefined,
                patternType: normalizedSearch.patternType,
              })
            }
            onRowClick={(item) =>
              void navigate({
                params: { knowledgeId: item.id },
                to: "/app/knowledge/$knowledgeId",
              })
            }
            onSearchChange={setSearchValue}
            onPatternTypeChange={(patternType) =>
              updateSearch({
                communicativeFunction: normalizedSearch.communicativeFunction,
                fixednessLevel: normalizedSearch.fixednessLevel,
                search: deferredSearchValue.trim() || undefined,
                patternType,
              })
            }
            searchValue={searchValue}
            patternType={normalizedSearch.patternType}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
