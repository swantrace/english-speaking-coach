import { createLazyFileRoute } from "@tanstack/react-router";
import { HistoryDetailPage } from "../../features/history/history-pages";

export const Route = createLazyFileRoute("/history/$sessionId")({
  component: HistoryDetailPage,
});
