import { createFileRoute } from "@tanstack/react-router";
import { RolePlayPracticePage, rolePlaySearchSchema } from "../../../../lib/app-pages";

export const Route = createFileRoute("/scenarios/$scenarioId/practice/role-play")({
  component: RolePlayPracticePage,
  validateSearch: (search) => rolePlaySearchSchema.parse(search),
});
