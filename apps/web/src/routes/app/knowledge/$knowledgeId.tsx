import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "@/components/app/route-placeholder";

export const Route = createFileRoute("/app/knowledge/$knowledgeId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RoutePlaceholder title="Knowledge Detail" />;
}
