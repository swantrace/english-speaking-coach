import { createFileRoute } from "@tanstack/react-router";
import { ScenarioDetailPage } from "../../../features/scenarios/scenario-pages";
import { rolePlaySearchSchema } from "../../../lib/app-data";

export const Route = createFileRoute("/scenarios/$scenarioId/")({
  component: ScenarioDetailPage,
  validateSearch: (search) => rolePlaySearchSchema.parse(search),
});
