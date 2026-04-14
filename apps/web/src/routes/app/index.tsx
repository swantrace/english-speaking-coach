import { Button } from "@english-coach/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { StudentMetrics } from "@/features/dashboard/components/student-metrics";
import { StudentTrendCharts } from "@/features/dashboard/components/student-trend-charts";
import { useStudentDashboardQuery } from "@/features/dashboard/queries";

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

function RouteComponent() {
  const dashboardQuery = useStudentDashboardQuery();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link to="/app/scenarios">Browse scenarios</Link>
          </Button>
        }
        description="Track recent speaking momentum and jump back into guided role-play practice from the learner side of the app."
        eyebrow="Student Dashboard"
        title="Learner dashboard"
      />

      {dashboardQuery.isPending ? (
        <LoadingState
          description="We’re assembling your recent speaking trends and learning totals."
          title="Loading dashboard"
        />
      ) : null}

      {dashboardQuery.isError ? (
        <ErrorState
          description={
            dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Dashboard data could not be loaded."
          }
          onRetry={() => void dashboardQuery.refetch()}
          title="Dashboard unavailable"
        />
      ) : null}

      {dashboardQuery.isSuccess && dashboardQuery.data.metrics.length === 0 ? (
        <EmptyState
          action={
            <Button asChild>
              <Link to="/app/scenarios">Explore scenarios</Link>
            </Button>
          }
          description="Once completed sessions and reviewed knowledge items are available, this dashboard will summarize progress here."
          title="No dashboard data yet"
        />
      ) : null}

      {dashboardQuery.isSuccess ? (
        <>
          <PageSection
            description="These cards stay focused on learner-facing outcomes so the route can remain stable even if the backend aggregate evolves next round."
            title="Progress snapshot"
          >
            <StudentMetrics metrics={dashboardQuery.data.metrics} />
          </PageSection>

          <PageSection
            description="Simple 21-day lines keep the first student slice readable while preserving room for richer analytics later."
            title="21-day trends"
          >
            <StudentTrendCharts trends={dashboardQuery.data.trends} />
          </PageSection>
        </>
      ) : null}
    </div>
  );
}
