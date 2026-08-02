import { Alert, AlertDescription, ArrowLeft, Button } from "@english-coach/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { normalizeSessionHistorySearch, type SessionHistorySearchParams } from "../history-search";
import { useRepeatSessionMutation } from "../mutations";
import { useSessionHistoryListQuery } from "../queries";
import { SessionHistoryTable } from "./session-history-table";

interface SessionHistoryPageProps {
  search: SessionHistorySearchParams;
}

export function SessionHistoryPage({ search }: SessionHistoryPageProps) {
  const navigate = useNavigate();
  const normalizedSearch = useMemo(() => normalizeSessionHistorySearch(search), [search]);
  const [searchValue, setSearchValue] = useState(normalizedSearch.search ?? "");
  const deferredSearchValue = useDeferredValue(searchValue);
  const sessionListQuery = useSessionHistoryListQuery({
    search: normalizedSearch.search,
    sessionType: normalizedSearch.sessionType,
  });
  const repeatSessionMutation = useRepeatSessionMutation({
    onSuccess: (result) =>
      navigate({
        params: result.liveRoute.params,
        to: result.liveRoute.to,
      }),
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
        search: (current) => normalizeSessionHistorySearch({ ...current, search: nextSearch }),
        to: "/app/sessions",
      });
    });
  }, [deferredSearchValue, navigate, normalizedSearch.search]);

  function updateSearch(nextSearch: SessionHistorySearchParams) {
    startTransition(() => {
      void navigate({
        replace: true,
        search: () => normalizeSessionHistorySearch(nextSearch),
        to: "/app/sessions",
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
        description="Review completed role-play and free-form practice sessions, then open a full post-session breakdown with transcript, feedback, and linked knowledge items."
        eyebrow="Session History"
        title="Past sessions"
      />

      {sessionListQuery.isPending ? (
        <LoadingState
          description="We’re loading your completed practice sessions and applying the selected filters."
          title="Loading session history"
        />
      ) : null}

      {sessionListQuery.isError ? (
        <ErrorState
          description={
            sessionListQuery.error instanceof Error
              ? sessionListQuery.error.message
              : "Session history is unavailable right now."
          }
          onRetry={() => void sessionListQuery.refetch()}
          title="Could not load session history"
        />
      ) : null}

      {sessionListQuery.isSuccess && sessionListQuery.data.items.length === 0 ? (
        <EmptyState
          description="Try adjusting the search text or session type filter. Only completed learner-visible sessions are shown here."
          title="No sessions match these filters"
        />
      ) : null}

      {sessionListQuery.isSuccess && sessionListQuery.data.items.length > 0 ? (
        <PageSection
          description={`${sessionListQuery.data.total.toLocaleString()} session${sessionListQuery.data.total === 1 ? "" : "s"} available for review.`}
          title="Completed sessions"
        >
          <SessionHistoryTable
            items={sessionListQuery.data.items}
            onRowClick={(item) =>
              void navigate({
                params: { sessionId: item.id },
                to: "/app/sessions/$sessionId",
              })
            }
            onRepeatSession={(item) => repeatSessionMutation.mutate(item.id)}
            onSearchChange={setSearchValue}
            onSessionTypeChange={(sessionType) =>
              updateSearch({
                search: deferredSearchValue.trim() || undefined,
                sessionType,
              })
            }
            searchValue={searchValue}
            selectedSessionType={normalizedSearch.sessionType}
            pendingSessionId={repeatSessionMutation.isPending ? repeatSessionMutation.variables : undefined}
          />
        </PageSection>
      ) : null}

      {repeatSessionMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{repeatSessionMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
