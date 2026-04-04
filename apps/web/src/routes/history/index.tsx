import { createFileRoute } from "@tanstack/react-router";
import { HistoryListPage } from "../../features/history/history-pages";

export const Route = createFileRoute("/history/")({
  component: HistoryListPage,
});
