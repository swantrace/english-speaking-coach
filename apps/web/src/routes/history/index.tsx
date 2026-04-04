import { createFileRoute } from "@tanstack/react-router";
import { HistoryListPage } from "../../features/history/history-pages";
import { historyListSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/history/")({
  component: HistoryListPage,
  validateSearch: (search) => historyListSearchSchema.parse(search),
});
