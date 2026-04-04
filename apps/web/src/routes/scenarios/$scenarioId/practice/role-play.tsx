import { createFileRoute } from "@tanstack/react-router";
import { RolePlayPracticePage } from "../../../../features/scenarios/scenario-pages";
import { rolePlaySearchSchema } from "../../../../lib/app-data";

export const Route = createFileRoute("/scenarios/$scenarioId/practice/role-play")({
  component: RolePlayPracticePage,
  validateSearch: (search) => rolePlaySearchSchema.parse(search),
});
