import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/admin/knowledge/bulk")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="Bulk Knowledge" />;
}
