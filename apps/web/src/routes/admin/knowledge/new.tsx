import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import {
  createOccurrenceMutationError,
  useApproveOccurrenceMutation,
  useEnrichOccurrenceMutation,
} from "@/features/admin/occurrences/mutations";
import { useAdminOccurrenceQuery } from "@/features/admin/occurrences/queries";
import type { ProposedOccurrenceListItemView } from "@/features/admin/occurrences/types";
import { normalizeAdminKnowledgeSearch } from "@/features/knowledge/admin-knowledge-search";
import { KnowledgeItemForm } from "@/features/knowledge/forms/knowledge-item-form";
import { parseKnowledgeNewSearch } from "@/features/knowledge/knowledge-new-search";
import { createEmptyKnowledgeFormValues } from "@/features/knowledge/mappers";
import { createKnowledgeMutationError, useCreateAdminKnowledgeMutation } from "@/features/knowledge/mutations";

export const Route = createFileRoute("/admin/knowledge/new")({
  component: RouteComponent,
  validateSearch: parseKnowledgeNewSearch,
});

function mapOccurrenceDraftToFormValues(occurrence: ProposedOccurrenceListItemView) {
  return createEmptyKnowledgeFormValues({
    communicativeFunction: occurrence.proposedCommunicativeFunction ?? "",
    fixednessLevel: occurrence.proposedFixednessLevel ?? "",
    pattern: occurrence.proposedPattern,
    patternType: occurrence.proposedPatternType ?? "",
    senses: occurrence.proposedSenses?.length
      ? occurrence.proposedSenses.map((sense) => ({
          example: sense.example,
          exampleZh: sense.exampleZh,
          grammaticalNote: sense.grammaticalNote ?? "",
          meaningEn: sense.meaningEn,
          meaningZh: sense.meaningZh,
          order: sense.order,
        }))
      : createEmptyKnowledgeFormValues().senses,
  });
}

function RouteComponent() {
  const search = Route.useSearch();

  return search.occurrenceId ? (
    <OccurrenceDraftReview occurrenceId={search.occurrenceId} />
  ) : (
    <ManualKnowledgeCreate pattern={search.pattern} />
  );
}

function KnowledgePageHeader({ reviewDraft = false }: { reviewDraft?: boolean }) {
  return (
    <PageHeader
      actions={
        <Button asChild variant="outline">
          <Link to={reviewDraft ? "/admin/occurrences" : "/admin/knowledge"}>
            {reviewDraft ? "Back to occurrences" : "Back to knowledge"}
          </Link>
        </Button>
      }
      description={
        reviewDraft
          ? "Review and edit the generated taxonomy and senses before approving this occurrence as a knowledge item."
          : "Create an approved knowledge item with its taxonomy and senses."
      }
      eyebrow="Admin Knowledge"
      title={reviewDraft ? "Review occurrence draft" : "Create knowledge item"}
    />
  );
}

function ManualKnowledgeCreate({ pattern }: { pattern?: string }) {
  const navigate = useNavigate();
  const createMutation = useCreateAdminKnowledgeMutation();

  return (
    <div className="space-y-8">
      <KnowledgePageHeader />
      <KnowledgeItemForm
        cancelTo="/admin/knowledge"
        defaultValues={createEmptyKnowledgeFormValues({ pattern: pattern ?? "" })}
        mode="create"
        onSubmit={async (values) => {
          try {
            await createMutation.mutateAsync(values);
            await navigate({ search: normalizeAdminKnowledgeSearch({}), to: "/admin/knowledge" });
          } catch (error) {
            throw new Error(createKnowledgeMutationError(error, "We couldn't create this knowledge item.").message);
          }
        }}
      />
    </div>
  );
}

function OccurrenceDraftReview({ occurrenceId }: { occurrenceId: string }) {
  const navigate = useNavigate();
  const occurrenceQuery = useAdminOccurrenceQuery(occurrenceId);
  const approveMutation = useApproveOccurrenceMutation();
  const enrichMutation = useEnrichOccurrenceMutation();
  const occurrence = occurrenceQuery.data;
  const draftIsComplete = Boolean(occurrence?.proposedPatternType && occurrence.proposedSenses?.length);

  return (
    <div className="space-y-8">
      <KnowledgePageHeader reviewDraft />

      {occurrenceQuery.isPending ? (
        <LoadingState description="We’re loading the generated occurrence draft for review." title="Loading draft" />
      ) : null}

      {occurrenceQuery.isError ? (
        <ErrorState
          description={
            occurrenceQuery.error instanceof Error
              ? occurrenceQuery.error.message
              : "The occurrence draft is unavailable."
          }
          onRetry={() => void occurrenceQuery.refetch()}
          title="Could not load occurrence draft"
        />
      ) : null}

      {occurrence && occurrence.status !== "proposed" ? (
        <ErrorState
          description="This occurrence has already been reviewed and can no longer create another knowledge item."
          title="Occurrence review complete"
        />
      ) : null}

      {occurrence?.status === "proposed" && !draftIsComplete ? (
        <ErrorState
          actionLabel={occurrence.draftStatus === "generating" ? "Generating…" : "Generate draft"}
          description={
            occurrence.draftStatus === "failed"
              ? `The last generation attempt failed: ${occurrence.draftError ?? "Unknown error"}. You can retry it.`
              : occurrence.draftStatus === "generating"
                ? "The taxonomy and senses are being generated asynchronously. This page will refresh when the draft is ready."
                : "The occurrence was captured, but its taxonomy and senses have not been generated yet."
          }
          onRetry={() => {
            if (!enrichMutation.isPending && occurrence.draftStatus !== "generating") {
              enrichMutation.mutate(occurrenceId);
            }
          }}
          title={occurrence.draftStatus === "failed" ? "Draft generation failed" : "Draft not ready"}
        />
      ) : null}

      {occurrence?.status === "proposed" && draftIsComplete ? (
        <KnowledgeItemForm
          cancelTo="/admin/occurrences"
          defaultValues={mapOccurrenceDraftToFormValues(occurrence)}
          mode="create"
          onSubmit={async (values) => {
            if (!values.patternType) {
              throw new Error("Select a pattern type before approving this occurrence.");
            }

            try {
              const result = await approveMutation.mutateAsync({
                occurrenceId,
                values: {
                  ...values,
                  patternType: values.patternType,
                },
              });
              await navigate({
                params: { knowledgeId: result.knowledgeItemId },
                to: "/admin/knowledge/$knowledgeId/edit",
              });
            } catch (error) {
              throw new Error(createOccurrenceMutationError(error, "We couldn't approve this occurrence.").message);
            }
          }}
          submitLabel="Approve and create knowledge item"
        />
      ) : null}
    </div>
  );
}
