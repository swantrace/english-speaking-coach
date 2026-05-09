import { Button, ClipboardList, Sparkles, Users } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { useAdminDashboardQuery } from "../queries";
import type { AdminDashboardOverviewView } from "../types";
import { AdminMetrics } from "./admin-metrics";
import { AdminTrendCharts } from "./admin-trend-charts";

function hasAdminDashboardData(data: AdminDashboardOverviewView) {
  const totalSummaryValue = Object.values(data.totals).reduce((sum, value) => sum + value, 0);
  return totalSummaryValue > 0 || data.usageTrend.length > 0 || data.contentTrend.length > 0;
}

export function AdminOverview() {
  const dashboardQuery = useAdminDashboardQuery();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link search={{ page: 1, pageSize: 20 }} to="/admin/ai-requests">
                <Sparkles />
                AI requests
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/submissions">
                <ClipboardList />
                Submissions
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link search={{ page: 1 }} to="/admin/users">
                <Users />
                Manage users
              </Link>
            </Button>
          </div>
        }
        description="A conservative admin landing view that summarizes platform usage and keeps room for future management slices."
        eyebrow="Admin Dashboard"
        title="Overview"
      />

      {dashboardQuery.isPending ? (
        <LoadingState
          description="We’re assembling the latest admin metrics and trend summaries."
          title="Loading admin dashboard"
        />
      ) : null}

      {dashboardQuery.isError ? (
        <ErrorState
          description={
            dashboardQuery.error instanceof Error
              ? dashboardQuery.error.message
              : "The admin dashboard could not be loaded right now."
          }
          onRetry={() => void dashboardQuery.refetch()}
          title="Dashboard unavailable"
        />
      ) : null}

      {dashboardQuery.isSuccess && !hasAdminDashboardData(dashboardQuery.data) ? (
        <EmptyState
          description="Once the backend starts returning admin aggregates for this environment, the overview cards and trends will appear here."
          title="No admin dashboard data yet"
        />
      ) : null}

      {dashboardQuery.isSuccess && hasAdminDashboardData(dashboardQuery.data) ? (
        <>
          <PageSection
            description="These cards stay tied to stable aggregate fields so the admin route remains lightweight even as backend analytics evolve."
            title="Platform snapshot"
          >
            <AdminMetrics metrics={dashboardQuery.data.metrics} />
          </PageSection>

          <PageSection
            description="Two chart blocks are enough for the first slice: one for usage, one for content creation."
            title="Trend summary"
          >
            <AdminTrendCharts
              contentTrend={dashboardQuery.data.contentTrend}
              usageTrend={dashboardQuery.data.usageTrend}
            />
          </PageSection>
        </>
      ) : null}
    </div>
  );
}
