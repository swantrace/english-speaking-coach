import { createFileRoute } from "@tanstack/react-router";
import { HistoryDetailPage } from "../../lib/app-pages";

export const Route = createFileRoute("/history/$sessionId")({
  component: HistoryDetailPage,
});
