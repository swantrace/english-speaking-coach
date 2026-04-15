import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { normalizeAdminKnowledgeSearch } from "@/features/knowledge/admin-knowledge-search";
import { BulkKnowledgeForm } from "@/features/knowledge/forms/bulk-knowledge-form";
import { createKnowledgeMutationError, useBulkKnowledgeGenerationMutation } from "@/features/knowledge/mutations";

export const Route = createFileRoute("/admin/knowledge/bulk")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const bulkMutation = useBulkKnowledgeGenerationMutation();

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
        description="Queue multiple draft knowledge patterns at once. Worker-generated items will be created later and marked pending review for admin follow-up."
        eyebrow="Admin Knowledge"
        title="Bulk generation entry"
      />

      <BulkKnowledgeForm
        cancelTo="/admin/knowledge"
        onSubmit={async (patterns) => {
          try {
            return await bulkMutation.mutateAsync(patterns);
          } catch (error) {
            throw new Error(
              createKnowledgeMutationError(error, "We couldn't submit the bulk generation request.").message,
            );
          }
        }}
        onSuccess={async () => {
          await navigate({ search: normalizeAdminKnowledgeSearch({}), to: "/admin/knowledge" });
        }}
      />
    </div>
  );
}
