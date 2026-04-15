import { createFileRoute } from "@tanstack/react-router";
import { SessionHistoryDetailPage } from "@/features/session/components/session-history-detail-page";

export const Route = createFileRoute("/app/sessions/$sessionId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { sessionId } = Route.useParams();

  return <SessionHistoryDetailPage sessionId={sessionId} />;
}
