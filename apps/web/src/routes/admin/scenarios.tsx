import { createFileRoute } from "@tanstack/react-router";
import { AdminScenarioPage } from "../../lib/app-pages";

export const Route = createFileRoute("/admin/scenarios")({
  component: AdminScenarioPage,
});
