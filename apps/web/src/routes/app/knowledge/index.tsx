import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/app/knowledge/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="Knowledge" />;
}
