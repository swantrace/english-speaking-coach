import { createLazyFileRoute } from "@tanstack/react-router";
import { ScenarioDetailPage } from "../../../features/scenarios/scenario-pages";

export const Route = createLazyFileRoute("/scenarios/$scenarioId/")({
  component: ScenarioDetailPage,
});
