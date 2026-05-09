import { Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { KeyValueGrid } from "@/components/app/key-value-grid";
import { PageSection } from "@/components/app/page-section";
import { AiRequestJsonView } from "./ai-request-json-view";
import type { AdminAiRequestDetailView } from "./types";

interface AiRequestDetailSectionsProps {
  request: AdminAiRequestDetailView;
}

function tokenValue(value: number | null) {
  return value === null ? "Unknown" : value.toLocaleString();
}

export function AiRequestDetailSections({ request }: AiRequestDetailSectionsProps) {
  const hasRelatedRecords = Boolean(
    request.submissionId ||
      request.submissionJobId ||
      request.sessionHistoryId ||
      request.scenarioId ||
      request.knowledgeItemId,
  );

  return (
    <div className="space-y-8">
      <PageSection description="Provider metadata and timing for this model call." title="Overview">
        <KeyValueGrid
          columns={4}
          items={[
            { label: "Operation", value: <span className="font-mono text-xs">{request.operation}</span> },
            { label: "Model", value: request.modelLabel },
            { label: "Started", value: request.startedAtLabel },
            { label: "Completed", value: request.completedAtLabel },
            { label: "Latency", value: request.latencyLabel },
            { label: "Total tokens", value: tokenValue(request.totalTokens) },
            { label: "Input tokens", value: tokenValue(request.inputTokens) },
            { label: "Output tokens", value: tokenValue(request.outputTokens) },
          ]}
        />
      </PageSection>

      <PageSection description="A quick token breakdown using normalized columns from the request log." title="Usage">
        <KeyValueGrid
          columns={4}
          items={[
            { label: "Reasoning", value: tokenValue(request.reasoningTokens) },
            { label: "Cache read", value: tokenValue(request.cacheReadTokens) },
            { label: "Cache write", value: tokenValue(request.cacheWriteTokens) },
            { label: "Raw usage", value: request.usage ? "Available" : "Not recorded" },
          ]}
        />
      </PageSection>

      {hasRelatedRecords ? (
        <PageSection description="Jump to the workflow record connected to this model request." title="Related records">
          <div className="flex flex-wrap gap-3">
            {request.submissionId ? (
              <Button asChild variant="outline">
                <Link params={{ submissionId: request.submissionId }} to="/admin/submissions/$submissionId">
                  Open submission
                </Link>
              </Button>
            ) : null}
            {request.submissionId && request.submissionJobId ? (
              <Button asChild variant="outline">
                <Link
                  params={{ jobId: request.submissionJobId, submissionId: request.submissionId }}
                  to="/admin/submissions/$submissionId/jobs/$jobId"
                >
                  Open job
                </Link>
              </Button>
            ) : null}
            {request.sessionHistoryId ? (
              <Button asChild variant="outline">
                <Link params={{ sessionId: request.sessionHistoryId }} to="/app/sessions/$sessionId">
                  Open session
                </Link>
              </Button>
            ) : null}
            {request.scenarioId ? (
              <Button asChild variant="outline">
                <Link params={{ scenarioId: request.scenarioId }} to="/admin/scenarios/$scenarioId/edit">
                  Open scenario
                </Link>
              </Button>
            ) : null}
            {request.knowledgeItemId ? (
              <Button asChild variant="outline">
                <Link params={{ knowledgeId: request.knowledgeItemId }} to="/admin/knowledge/$knowledgeId/edit">
                  Open knowledge item
                </Link>
              </Button>
            ) : null}
          </div>
        </PageSection>
      ) : null}

      <PageSection
        description="Input and output are shown together so prompt/result pairs can be reviewed without jumping around."
        title="Input and output"
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <AiRequestJsonView
            emptyMessage="No input payload was recorded for this request."
            title="Input"
            value={request.input}
          />
          <AiRequestJsonView
            emptyMessage="No output payload is available for this request."
            title="Output"
            value={request.output}
          />
        </div>
      </PageSection>

      {request.error ? (
        <PageSection description="The stored error object is preserved for failure debugging." title="Error">
          <AiRequestJsonView emptyMessage="No error was recorded." title="Error payload" value={request.error} />
        </PageSection>
      ) : null}

      <PageSection
        description="Raw provider output and usage are kept separate from the normalized view."
        title="Raw data"
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <AiRequestJsonView
            emptyMessage="No raw provider output was recorded."
            title="Raw output"
            value={request.rawOutput}
          />
          <AiRequestJsonView
            emptyMessage="No usage payload was recorded."
            title="Usage payload"
            value={request.usage}
          />
        </div>
      </PageSection>

      <PageSection description="Additional context supplied by the calling workflow." title="Metadata">
        <AiRequestJsonView emptyMessage="No metadata was recorded." title="Metadata" value={request.metadata} />
      </PageSection>
    </div>
  );
}
