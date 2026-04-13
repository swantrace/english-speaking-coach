import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/admin/knowledge/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="New Knowledge" />;
}
