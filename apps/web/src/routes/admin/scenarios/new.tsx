import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/admin/scenarios/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="New Scenario" />;
}
