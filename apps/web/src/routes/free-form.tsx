import { createFileRoute } from "@tanstack/react-router";
import { FreeFormPage, freeFormSearchSchema } from "../lib/app-pages";

export const Route = createFileRoute("/free-form")({
  component: FreeFormPage,
  validateSearch: (search) => freeFormSearchSchema.parse(search),
});
