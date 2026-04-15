import { ArrowLeft, Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { getAdminUsersPageSize } from "@/features/admin/users/api";
import { useAdminUsersQuery } from "@/features/admin/users/queries";
import { normalizeAdminUserSearch, parseAdminUserSearch } from "@/features/admin/users/user-search";
import { UserTable } from "@/features/admin/users/user-table";

export const Route = createFileRoute("/admin/users/")({
  validateSearch: parseAdminUserSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const normalizedSearch = useMemo(() => normalizeAdminUserSearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const userQuery = useAdminUsersQuery({
    page: normalizedSearch.page,
    pageSize: getAdminUsersPageSize(),
    role: normalizedSearch.role,
    search: normalizedSearch.search,
    status: normalizedSearch.status,
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
        search: () =>
          normalizeAdminUserSearch({
            page: 1,
            role: normalizedSearch.role,
            search: nextSearch,
            status: normalizedSearch.status,
          }),
        to: "/admin/users",
      });
    });
  }, [deferredSearchValue, navigate, normalizedSearch.role, normalizedSearch.search, normalizedSearch.status]);

  function updateSearch(nextSearch: Partial<typeof normalizedSearch>) {
    startTransition(() => {
      void navigate({
        replace: true,
        search: () =>
          normalizeAdminUserSearch({
            page: nextSearch.page ?? 1,
            role: nextSearch.role,
            search: nextSearch.search,
            status: nextSearch.status,
          }),
        to: "/admin/users",
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
        description="Review account state, filter by role or status, and take conservative row-level admin actions."
        eyebrow="Admin Users"
        title="User management"
      />

      {userQuery.isPending ? (
        <PageSection description="We’re loading the current admin user list with your selected filters." title="Users">
          <DataTableSkeleton />
        </PageSection>
      ) : null}

      {userQuery.isError ? (
        <ErrorState
          description={
            userQuery.error instanceof Error ? userQuery.error.message : "The user list is unavailable right now."
          }
          onRetry={() => void userQuery.refetch()}
          title="Could not load users"
        />
      ) : null}

      {userQuery.isSuccess ? (
        <PageSection
          description={`${userQuery.data.total.toLocaleString()} user${userQuery.data.total === 1 ? "" : "s"} found.`}
          title="Users"
        >
          <UserTable
            isPending={userQuery.isFetching}
            items={userQuery.data.items}
            onPageChange={(page) =>
              updateSearch({
                page,
                role: normalizedSearch.role,
                search: searchValue.trim() || undefined,
                status: normalizedSearch.status,
              })
            }
            onRoleChange={(role) =>
              updateSearch({
                role,
                search: searchValue.trim() || undefined,
                status: normalizedSearch.status,
              })
            }
            onSearchChange={setSearchValue}
            onStatusChange={(status) =>
              updateSearch({
                role: normalizedSearch.role,
                search: searchValue.trim() || undefined,
                status,
              })
            }
            page={userQuery.data.page}
            pageSize={userQuery.data.pageSize}
            role={normalizedSearch.role}
            searchValue={searchValue}
            status={normalizedSearch.status}
            total={userQuery.data.total}
            totalPages={userQuery.data.totalPages}
          />
        </PageSection>
      ) : null}

      {userQuery.isFetching && !userQuery.isPending ? (
        <LoadingState description="We’re refreshing the list with the latest admin changes." title="Refreshing users" />
      ) : null}
    </div>
  );
}
