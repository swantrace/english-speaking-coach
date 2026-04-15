import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeListPage } from "@/features/knowledge/components/knowledge-list-page";
import { parseKnowledgeSearch } from "@/features/knowledge/knowledge-search";

export const Route = createFileRoute("/app/knowledge/")({
  validateSearch: parseKnowledgeSearch,
  component: RouteComponent,
});

function RouteComponent() {
  return <KnowledgeListPage search={Route.useSearch()} />;
}
