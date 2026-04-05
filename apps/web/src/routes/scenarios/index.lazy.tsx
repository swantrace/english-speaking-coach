import { createLazyFileRoute } from "@tanstack/react-router";
import { ScenarioBrowserPage } from "../../features/scenarios/scenario-pages";

export const Route = createLazyFileRoute("/scenarios/")({
  component: ScenarioBrowserPage,
});
