import { createFileRoute } from "@tanstack/react-router";
import { AdminScenarioPage } from "../../features/admin/admin-pages";
import { adminScenariosSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/admin/scenarios")({
  component: AdminScenarioPage,
  validateSearch: (search) => adminScenariosSearchSchema.parse(search),
});
