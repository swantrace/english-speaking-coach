import { createFileRoute } from "@tanstack/react-router";
import { rolePlaySearchSchema } from "../../../lib/app-data";

export const Route = createFileRoute("/scenarios/$scenarioId/")({
  validateSearch: (search) => rolePlaySearchSchema.parse(search),
});
