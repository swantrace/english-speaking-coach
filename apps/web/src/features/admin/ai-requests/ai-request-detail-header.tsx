import { ArrowLeft, Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { AiRequestStatusBadge } from "./ai-request-status-badge";
import type { AdminAiRequestDetailView } from "./types";

interface AiRequestDetailHeaderProps {
  request: AdminAiRequestDetailView;
}

export function AiRequestDetailHeader({ request }: AiRequestDetailHeaderProps) {
  return (
    <PageHeader
      actions={
        <Button asChild variant="outline">
          <Link search={{ page: 1, pageSize: 20 }} to="/admin/ai-requests">
            <ArrowLeft />
            Back to AI requests
          </Link>
        </Button>
      }
      description={`${request.operation} through ${request.modelLabel}`}
      eyebrow="AI Request Detail"
      title={
        <span className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-2xl">{request.id}</span>
          <AiRequestStatusBadge status={request.status} />
        </span>
      }
    />
  );
}
