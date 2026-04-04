import { createFileRoute } from "@tanstack/react-router";
import { ScenarioBrowserPage } from "../../features/scenarios/scenario-pages";
import { learnerScenariosSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/scenarios/")({
  component: ScenarioBrowserPage,
  validateSearch: (search) => learnerScenariosSearchSchema.parse(search),
});
