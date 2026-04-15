import { createFileRoute } from "@tanstack/react-router";
import { SessionHistoryPage } from "@/features/session/components/session-history-page";
import { parseSessionHistorySearch } from "@/features/session/history-search";

export const Route = createFileRoute("/app/sessions/")({
  validateSearch: parseSessionHistorySearch,
  component: RouteComponent,
});

function RouteComponent() {
  return <SessionHistoryPage search={Route.useSearch()} />;
}
