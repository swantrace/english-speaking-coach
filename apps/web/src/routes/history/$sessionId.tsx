import { createFileRoute } from "@tanstack/react-router";
import { historyDetailSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/history/$sessionId")({
  validateSearch: (search) => historyDetailSearchSchema.parse(search),
});
