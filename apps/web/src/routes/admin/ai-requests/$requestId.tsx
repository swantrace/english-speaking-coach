import { createFileRoute } from "@tanstack/react-router";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { AiRequestDetailHeader } from "@/features/admin/ai-requests/ai-request-detail-header";
import { AiRequestDetailSections } from "@/features/admin/ai-requests/ai-request-detail-sections";
import { useAdminAiRequestDetailQuery } from "@/features/admin/ai-requests/queries";

export const Route = createFileRoute("/admin/ai-requests/$requestId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  const requestQuery = useAdminAiRequestDetailQuery(requestId);

  if (requestQuery.isPending) {
    return (
      <LoadingState
        description="We’re loading the logged input, output, raw usage, and metadata for this model request."
        title="Loading AI request"
      />
    );
  }

  if (requestQuery.isError) {
    return (
      <ErrorState
        description={
          requestQuery.error instanceof Error
            ? requestQuery.error.message
            : "The AI request detail could not be loaded."
        }
        onRetry={() => void requestQuery.refetch()}
        title="AI request unavailable"
      />
    );
  }

  return (
    <div className="space-y-8">
      <AiRequestDetailHeader request={requestQuery.data} />
      <AiRequestDetailSections request={requestQuery.data} />
    </div>
  );
}
