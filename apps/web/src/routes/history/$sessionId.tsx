import { createFileRoute } from "@tanstack/react-router";
import { HistoryDetailPage } from "../../features/history/history-pages";
import { historyDetailSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/history/$sessionId")({
  component: HistoryDetailPage,
  validateSearch: (search) => historyDetailSearchSchema.parse(search),
});
