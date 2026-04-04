import { createFileRoute } from "@tanstack/react-router";
import { AdminScenarioPage } from "../../features/admin/admin-pages";

export const Route = createFileRoute("/admin/scenarios")({
  component: AdminScenarioPage,
});
