import { createFileRoute } from "@tanstack/react-router";
import { ScenarioBrowserPage } from "../../lib/app-pages";

export const Route = createFileRoute("/scenarios/")({
  component: ScenarioBrowserPage,
});
