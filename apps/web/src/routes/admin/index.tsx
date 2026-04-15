import { createFileRoute } from "@tanstack/react-router";
import { AdminOverview } from "@/features/dashboard/components/admin-overview";

export const Route = createFileRoute("/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AdminOverview />;
}
