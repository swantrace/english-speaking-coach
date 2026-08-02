import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { normalizeAdminScenarioSearch } from "@/features/scenario/admin-scenario-search";
import { uploadAdminScenarioImage } from "@/features/scenario/api";
import { ScenarioForm } from "@/features/scenario/forms/scenario-form";
import { createScenarioMutationError, useCreateAdminScenarioMutation } from "@/features/scenario/mutations";

export const Route = createFileRoute("/admin/scenarios/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const createMutation = useCreateAdminScenarioMutation();

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
        description="Create an admin-managed role-play scenario with the full domain structure, including characters, goals, dialogue, review state, and optional image metadata."
        eyebrow="Admin Scenarios"
        title="Create scenario"
      />

      <ScenarioForm
        cancelTo="/admin/scenarios"
        mode="create"
        onSubmit={async (values, image) => {
          try {
            const scenario = await createMutation.mutateAsync(values);
            if (image.file) {
              await uploadAdminScenarioImage(scenario.id, image.file);
            }
            await navigate({ search: normalizeAdminScenarioSearch({}), to: "/admin/scenarios" });
          } catch (error) {
            throw new Error(createScenarioMutationError(error, "We couldn't create this scenario.").message);
          }
        }}
      />
    </div>
  );
}
