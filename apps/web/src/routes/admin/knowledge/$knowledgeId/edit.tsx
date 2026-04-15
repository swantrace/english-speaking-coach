import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { normalizeAdminKnowledgeSearch } from "@/features/knowledge/admin-knowledge-search";
import { KnowledgeItemForm } from "@/features/knowledge/forms/knowledge-item-form";
import { mapAdminKnowledgeDetailToFormValues } from "@/features/knowledge/mappers";
import {
  createKnowledgeMutationError,
  useDeleteAdminKnowledgeMutation,
  useUpdateAdminKnowledgeMutation,
} from "@/features/knowledge/mutations";
import { useAdminKnowledgeDetailQuery } from "@/features/knowledge/queries";

export const Route = createFileRoute("/admin/knowledge/$knowledgeId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { knowledgeId } = Route.useParams();
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const knowledgeQuery = useAdminKnowledgeDetailQuery(knowledgeId);
  const updateMutation = useUpdateAdminKnowledgeMutation();
  const deleteMutation = useDeleteAdminKnowledgeMutation();

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
        description="Update the knowledge item in place, then return to the admin knowledge inventory when you’re done."
        eyebrow="Admin Knowledge"
        title="Edit knowledge item"
      />

      {knowledgeQuery.isPending ? (
        <LoadingState
          description="We’re loading the current knowledge item details for editing."
          title="Loading knowledge item"
        />
      ) : null}

      {knowledgeQuery.isError ? (
        <ErrorState
          description={
            knowledgeQuery.error instanceof Error
              ? knowledgeQuery.error.message
              : "The knowledge item detail is unavailable."
          }
          onRetry={() => void knowledgeQuery.refetch()}
          title="Could not load knowledge item"
        />
      ) : null}

      {knowledgeQuery.isSuccess ? (
        <>
          <KnowledgeItemForm
            cancelTo="/admin/knowledge"
            defaultValues={mapAdminKnowledgeDetailToFormValues(knowledgeQuery.data)}
            deleteAction={
              <Button onClick={() => setIsDeleteOpen(true)} type="button" variant="outline">
                Delete knowledge item
              </Button>
            }
            mode="edit"
            onSubmit={async (values) => {
              try {
                await updateMutation.mutateAsync({
                  knowledgeId,
                  values,
                });
                await navigate({ search: normalizeAdminKnowledgeSearch({}), to: "/admin/knowledge" });
              } catch (error) {
                throw new Error(createKnowledgeMutationError(error, "We couldn't save this knowledge item.").message);
              }
            }}
          />

          <ConfirmDialog
            confirmLabel="Delete knowledge item"
            description="This permanently removes the knowledge item from admin management."
            errorMessage={deleteMutation.error ? deleteMutation.error.message : null}
            isPending={deleteMutation.isPending}
            onConfirm={async () => {
              try {
                await deleteMutation.mutateAsync(knowledgeId);
                await navigate({ search: normalizeAdminKnowledgeSearch({}), to: "/admin/knowledge" });
              } catch (error) {
                throw new Error(createKnowledgeMutationError(error, "We couldn't delete this knowledge item.").message);
              }
            }}
            onOpenChange={setIsDeleteOpen}
            open={isDeleteOpen}
            title="Delete this knowledge item?"
          />
        </>
      ) : null}
    </div>
  );
}
