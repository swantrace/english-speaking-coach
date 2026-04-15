import { Button, Files, Plus } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { normalizeAdminKnowledgeSearch, parseAdminKnowledgeSearch } from "@/features/knowledge/admin-knowledge-search";
import { AdminKnowledgeTable } from "@/features/knowledge/components/admin-knowledge-table";
import { useAdminKnowledgeListQuery } from "@/features/knowledge/queries";

export const Route = createFileRoute("/admin/knowledge/")({
  component: RouteComponent,
  validateSearch: parseAdminKnowledgeSearch,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const normalizedSearch = useMemo(() => normalizeAdminKnowledgeSearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const knowledgeQuery = useAdminKnowledgeListQuery(normalizedSearch);

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
          normalizeAdminKnowledgeSearch({
            ...current,
            communicativeFunction: normalizedSearch.communicativeFunction,
            fixednessLevel: normalizedSearch.fixednessLevel,
            reviewStatus: normalizedSearch.reviewStatus,
            search: nextSearch,
            syntaxRole: normalizedSearch.syntaxRole,
          }),
        to: "/admin/knowledge",
      });
    });
  }, [
    deferredSearchValue,
    navigate,
    normalizedSearch.communicativeFunction,
    normalizedSearch.fixednessLevel,
    normalizedSearch.reviewStatus,
    normalizedSearch.search,
    normalizedSearch.syntaxRole,
  ]);

  function updateSearch(nextSearch: Partial<typeof normalizedSearch>) {
    startTransition(() => {
      void navigate({
        replace: true,
        search: () =>
          normalizeAdminKnowledgeSearch({
            communicativeFunction: nextSearch.communicativeFunction ?? normalizedSearch.communicativeFunction,
            fixednessLevel: nextSearch.fixednessLevel ?? normalizedSearch.fixednessLevel,
            reviewStatus: nextSearch.reviewStatus ?? normalizedSearch.reviewStatus,
            search: nextSearch.search ?? (searchValue.trim() || undefined),
            syntaxRole: nextSearch.syntaxRole ?? normalizedSearch.syntaxRole,
          }),
        to: "/admin/knowledge",
      });
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/admin/knowledge/bulk">
                <Files />
                Bulk generate
              </Link>
            </Button>
            <Button asChild className="bg-slate-950 !text-white hover:bg-slate-800 [&_*]:!text-white">
              <Link className="!text-white" to="/admin/knowledge/new">
                <Plus />
                New knowledge item
              </Link>
            </Button>
          </div>
        }
        description="Browse admin-managed knowledge items, review pending content, and take row-level or bulk actions."
        eyebrow="Admin Knowledge"
        title="Knowledge management"
      />

      {knowledgeQuery.isPending ? (
        <PageSection
          description="We’re loading the current admin knowledge inventory with your selected filters."
          title="Knowledge items"
        >
          <DataTableSkeleton columnCount={7} />
        </PageSection>
      ) : null}

      {knowledgeQuery.isError ? (
        <ErrorState
          description={
            knowledgeQuery.error instanceof Error
              ? knowledgeQuery.error.message
              : "The admin knowledge inventory is unavailable right now."
          }
          onRetry={() => void knowledgeQuery.refetch()}
          title="Could not load knowledge items"
        />
      ) : null}

      {knowledgeQuery.isSuccess ? (
        <PageSection
          description={`${knowledgeQuery.data.total.toLocaleString()} knowledge item${
            knowledgeQuery.data.total === 1 ? "" : "s"
          } found.`}
          title="Knowledge items"
        >
          <AdminKnowledgeTable
            communicativeFunction={normalizedSearch.communicativeFunction}
            fixednessLevel={normalizedSearch.fixednessLevel}
            items={knowledgeQuery.data.items}
            onCommunicativeFunctionChange={(communicativeFunction) =>
              updateSearch({
                communicativeFunction: communicativeFunction as typeof normalizedSearch.communicativeFunction,
              })
            }
            onFixednessLevelChange={(fixednessLevel) =>
              updateSearch({
                fixednessLevel: fixednessLevel as typeof normalizedSearch.fixednessLevel,
              })
            }
            onReviewStatusChange={(reviewStatus) =>
              updateSearch({
                reviewStatus,
              })
            }
            onSearchChange={setSearchValue}
            onSyntaxRoleChange={(syntaxRole) =>
              updateSearch({
                syntaxRole: syntaxRole as typeof normalizedSearch.syntaxRole,
              })
            }
            reviewStatus={normalizedSearch.reviewStatus}
            searchValue={searchValue}
            syntaxRole={normalizedSearch.syntaxRole}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
