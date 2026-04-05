import { createFileRoute } from "@tanstack/react-router";
import { freeFormSearchSchema } from "../lib/app-data";

export const Route = createFileRoute("/free-form")({
  validateSearch: (search) => freeFormSearchSchema.parse(search),
});
