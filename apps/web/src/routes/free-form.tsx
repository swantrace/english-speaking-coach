import { createFileRoute } from "@tanstack/react-router";
import { FreeFormPage } from "../features/scenarios/scenario-pages";
import { freeFormSearchSchema } from "../lib/app-data";

export const Route = createFileRoute("/free-form")({
  component: FreeFormPage,
  validateSearch: (search) => freeFormSearchSchema.parse(search),
});
