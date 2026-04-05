import { createLazyFileRoute } from "@tanstack/react-router";
import { FreeFormPage } from "../features/scenarios/scenario-pages";

export const Route = createLazyFileRoute("/free-form")({
  component: FreeFormPage,
});
