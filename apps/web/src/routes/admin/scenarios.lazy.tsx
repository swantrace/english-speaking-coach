import { createLazyFileRoute } from "@tanstack/react-router";
import { AdminScenarioPage } from "../../features/admin/admin-scenario-page";

export const Route = createLazyFileRoute("/admin/scenarios")({
  component: AdminScenarioPage,
});
