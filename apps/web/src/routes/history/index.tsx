import { createFileRoute } from "@tanstack/react-router";
import { HistoryListPage } from "../../lib/app-pages";

export const Route = createFileRoute("/history/")({
  component: HistoryListPage,
});
