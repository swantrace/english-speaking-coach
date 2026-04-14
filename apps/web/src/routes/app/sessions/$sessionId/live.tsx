import { createFileRoute } from "@tanstack/react-router";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { LiveSessionPage } from "@/features/session/components/live-session-page";
import { useLiveSessionBootstrapQuery } from "@/features/session/queries";

export const Route = createFileRoute("/app/sessions/$sessionId/live")({
  component: RouteComponent,
});

function RouteComponent() {
  const { sessionId } = Route.useParams();
  const liveSessionBootstrapQuery = useLiveSessionBootstrapQuery(sessionId);

  if (liveSessionBootstrapQuery.isLoading) {
    return (
      <LoadingState
        title="Preparing your live session"
        description="We’re loading the room credentials, side content, and practice context for this session."
      />
    );
  }

  if (liveSessionBootstrapQuery.isError || !liveSessionBootstrapQuery.data) {
    return (
      <ErrorState
        description="We couldn't load the live practice session. Please retry from your sessions area."
        onRetry={() => void liveSessionBootstrapQuery.refetch()}
        title="Live session unavailable"
      />
    );
  }

  return <LiveSessionPage bootstrap={liveSessionBootstrapQuery.data} />;
}
