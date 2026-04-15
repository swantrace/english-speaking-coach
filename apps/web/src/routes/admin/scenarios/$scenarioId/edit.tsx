import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { normalizeAdminScenarioSearch } from "@/features/scenario/admin-scenario-search";
import { ScenarioForm } from "@/features/scenario/forms/scenario-form";
import { mapScenarioDetailToFormValues } from "@/features/scenario/mappers";
import {
  createScenarioMutationError,
  useDeleteAdminScenarioMutation,
  useUpdateAdminScenarioMutation,
} from "@/features/scenario/mutations";
import { useAdminScenarioDetailQuery } from "@/features/scenario/queries";

export const Route = createFileRoute("/admin/scenarios/$scenarioId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { scenarioId } = Route.useParams();
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const scenarioQuery = useAdminScenarioDetailQuery(scenarioId);
  const updateMutation = useUpdateAdminScenarioMutation();
  const deleteMutation = useDeleteAdminScenarioMutation();

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
        description="Update a scenario in place, then return to the admin scenario list when you’re done."
        eyebrow="Admin Scenarios"
        title="Edit scenario"
      />

      {scenarioQuery.isPending ? (
        <LoadingState description="We’re loading the current scenario details for editing." title="Loading scenario" />
      ) : null}

      {scenarioQuery.isError ? (
        <ErrorState
          description={
            scenarioQuery.error instanceof Error ? scenarioQuery.error.message : "The scenario detail is unavailable."
          }
          onRetry={() => void scenarioQuery.refetch()}
          title="Could not load scenario"
        />
      ) : null}

      {scenarioQuery.isSuccess ? (
        <>
          <ScenarioForm
            cancelTo="/admin/scenarios"
            defaultValues={mapScenarioDetailToFormValues(scenarioQuery.data)}
            deleteAction={
              <Button onClick={() => setIsDeleteOpen(true)} type="button" variant="outline">
                Delete scenario
              </Button>
            }
            mode="edit"
            onSubmit={async (values) => {
              try {
                await updateMutation.mutateAsync({
                  scenarioId,
                  values,
                });
                await navigate({ search: normalizeAdminScenarioSearch({}), to: "/admin/scenarios" });
              } catch (error) {
                throw new Error(createScenarioMutationError(error, "We couldn't save this scenario.").message);
              }
            }}
          />

          <ConfirmDialog
            confirmLabel="Delete scenario"
            description="This permanently removes the scenario from admin management and learner browsing."
            errorMessage={deleteMutation.error ? deleteMutation.error.message : null}
            isPending={deleteMutation.isPending}
            onConfirm={async () => {
              try {
                await deleteMutation.mutateAsync(scenarioId);
                await navigate({ search: normalizeAdminScenarioSearch({}), to: "/admin/scenarios" });
              } catch (error) {
                throw new Error(createScenarioMutationError(error, "We couldn't delete this scenario.").message);
              }
            }}
            onOpenChange={setIsDeleteOpen}
            open={isDeleteOpen}
            title="Delete this scenario?"
          />
        </>
      ) : null}
    </div>
  );
}
