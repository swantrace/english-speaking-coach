import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { createOccurrenceMutationError, useLinkOccurrenceMutation } from "@/features/admin/occurrences/mutations";
import { normalizeAdminKnowledgeSearch } from "@/features/knowledge/admin-knowledge-search";
import { KnowledgeItemForm } from "@/features/knowledge/forms/knowledge-item-form";
import { parseKnowledgeNewSearch } from "@/features/knowledge/knowledge-new-search";
import { createEmptyKnowledgeFormValues } from "@/features/knowledge/mappers";
import { createKnowledgeMutationError, useCreateAdminKnowledgeMutation } from "@/features/knowledge/mutations";

export const Route = createFileRoute("/admin/knowledge/new")({
  component: RouteComponent,
  validateSearch: parseKnowledgeNewSearch,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const createMutation = useCreateAdminKnowledgeMutation();
  const linkOccurrenceMutation = useLinkOccurrenceMutation();
  const defaultValues = createEmptyKnowledgeFormValues({
    isPendingReview: Boolean(search.occurrenceId),
    pattern: search.pattern ?? "",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link search={normalizeAdminKnowledgeSearch({})} to="/admin/knowledge">
              Back to knowledge
            </Link>
          </Button>
        }
        description="Create a new admin-managed knowledge item with the full domain structure, including taxonomy, senses, and review state."
        eyebrow="Admin Knowledge"
        title="Create knowledge item"
      />

      <KnowledgeItemForm
        cancelTo="/admin/knowledge"
        defaultValues={defaultValues}
        mode="create"
        onSubmit={async (values) => {
          try {
            const result = await createMutation.mutateAsync(values);

            if (search.occurrenceId) {
              try {
                await linkOccurrenceMutation.mutateAsync({
                  knowledgeItemId: result.id,
                  occurrenceId: search.occurrenceId,
                });
              } catch (error) {
                throw new Error(
                  createOccurrenceMutationError(
                    error,
                    "We created the knowledge item, but couldn't link the occurrence to it.",
                  ).message,
                );
              }
            }

            await navigate({ search: normalizeAdminKnowledgeSearch({}), to: "/admin/knowledge" });
          } catch (error) {
            if (error instanceof Error && error.message.includes("couldn't link the occurrence")) {
              throw error;
            }

            throw new Error(createKnowledgeMutationError(error, "We couldn't create this knowledge item.").message);
          }
        }}
      />
    </div>
  );
}
