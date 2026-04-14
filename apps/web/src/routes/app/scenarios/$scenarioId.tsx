import { Button } from "@english-coach/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { ScenarioExampleDialogue } from "@/features/scenario/components/scenario-example-dialogue";
import { ScenarioGoalList } from "@/features/scenario/components/scenario-goal-list";
import { ScenarioHero } from "@/features/scenario/components/scenario-hero";
import { ScenarioRoleButtons } from "@/features/scenario/components/scenario-role-buttons";
import { useStudentScenarioDetailQuery } from "@/features/scenario/queries";

export const Route = createFileRoute("/app/scenarios/$scenarioId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { scenarioId } = Route.useParams();
  const scenarioDetailQuery = useStudentScenarioDetailQuery(scenarioId);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link to="/app/scenarios">Back to scenarios</Link>
          </Button>
        }
        description="Review the setting, dialogue goals, and both roles, then start the role-play session directly from this page."
        eyebrow="Scenario Detail"
        title="Scenario detail"
      />

      {scenarioDetailQuery.isPending ? (
        <LoadingState
          description="We’re loading the selected scenario and its learner-facing practice brief."
          title="Loading scenario"
        />
      ) : null}

      {scenarioDetailQuery.isError ? (
        <ErrorState
          description={
            scenarioDetailQuery.error instanceof Error
              ? scenarioDetailQuery.error.message
              : "Scenario detail could not be loaded."
          }
          onRetry={() => void scenarioDetailQuery.refetch()}
          title="Scenario unavailable"
        />
      ) : null}

      {scenarioDetailQuery.isSuccess ? (
        <>
          <ScenarioHero scenario={scenarioDetailQuery.data} />

          <PageSection
            description="These two roles come directly from the scenario contract and now hand off into the shared role-play session creation flow."
            title="Choose your role"
          >
            <ScenarioRoleButtons
              characters={scenarioDetailQuery.data.characters}
              scenarioId={scenarioDetailQuery.data.id}
            />
          </PageSection>

          <PageSection
            description="Goals stay learner-facing here: enough structure to guide practice, without exposing admin editing concerns."
            title="Dialogue goals"
          >
            <ScenarioGoalList scenario={scenarioDetailQuery.data} />
          </PageSection>

          <PageSection
            description="An example conversation gives the learner a feel for pacing, tone, and the kind of successful exchange this scenario supports."
            title="Example dialogue"
          >
            <ScenarioExampleDialogue turns={scenarioDetailQuery.data.exampleDialogue} />
          </PageSection>
        </>
      ) : null}
    </div>
  );
}
