import { createFileRoute } from "@tanstack/react-router";
import { ScenarioDetailPage } from "../../../features/scenarios/scenario-pages";

export const Route = createFileRoute("/scenarios/$scenarioId/")({
  component: ScenarioDetailPage,
});
