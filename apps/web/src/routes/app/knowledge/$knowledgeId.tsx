import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeDetailPage } from "@/features/knowledge/components/knowledge-detail-page";

export const Route = createFileRoute("/app/knowledge/$knowledgeId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { knowledgeId } = Route.useParams();

  return <KnowledgeDetailPage knowledgeId={knowledgeId} />;
}
