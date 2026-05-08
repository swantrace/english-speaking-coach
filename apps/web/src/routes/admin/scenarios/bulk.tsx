import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { normalizeAdminScenarioSearch } from "@/features/scenario/admin-scenario-search";
import { BulkScenarioForm } from "@/features/scenario/forms/bulk-scenario-form";
import { createScenarioMutationError, useBulkScenarioGenerationMutation } from "@/features/scenario/mutations";

export const Route = createFileRoute("/admin/scenarios/bulk")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const bulkMutation = useBulkScenarioGenerationMutation();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link search={normalizeAdminScenarioSearch({})} to="/admin/scenarios">
              Back to scenarios
            </Link>
          </Button>
        }
        description="Queue multiple draft scenario settings at once. Worker-generated scenarios will be created later and marked pending review for admin follow-up."
        eyebrow="Admin Scenarios"
        title="Bulk generation entry"
      />

      <BulkScenarioForm
        cancelTo="/admin/scenarios"
        onSubmit={async (drafts) => {
          try {
            return await bulkMutation.mutateAsync(drafts);
          } catch (error) {
            throw new Error(
              createScenarioMutationError(error, "We couldn't submit the bulk generation request.").message,
            );
          }
        }}
        onSuccess={async (result) => {
          await navigate({
            params: { submissionId: result.submissionId },
            to: "/admin/submissions/$submissionId",
          });
        }}
      />
    </div>
  );
}
