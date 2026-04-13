import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="Public Home" />;
}
