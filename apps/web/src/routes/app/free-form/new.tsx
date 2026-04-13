import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/app/free-form/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="New Free-Form Session" />;
}
