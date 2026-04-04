import { createFileRoute } from "@tanstack/react-router";
import { ScenarioBrowserPage } from "../../features/scenarios/scenario-pages";

export const Route = createFileRoute("/scenarios/")({
  component: ScenarioBrowserPage,
});
