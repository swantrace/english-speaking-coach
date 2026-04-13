import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/admin/scenarios/$scenarioId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="Edit Scenario" />;
}
