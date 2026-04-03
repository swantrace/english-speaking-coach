import { createFileRoute } from "@tanstack/react-router";
import { ScenarioDetailPage } from "../../../lib/app-pages";

export const Route = createFileRoute("/scenarios/$scenarioId/")({
  component: ScenarioDetailPage,
});
