import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/app/sessions/$sessionId/live")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="Live Session" />;
}
