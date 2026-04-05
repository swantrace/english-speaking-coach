import { createFileRoute } from "@tanstack/react-router";
import { historyListSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/history/")({
  validateSearch: (search) => historyListSearchSchema.parse(search),
});
