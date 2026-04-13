import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/admin/users/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="Users" />;
}
