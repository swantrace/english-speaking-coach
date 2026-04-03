import { createFileRoute } from "@tanstack/react-router";
import { AdminKnowledgeItemsPage } from "../../lib/app-pages";

export const Route = createFileRoute("/admin/knowledge-items")({
  component: AdminKnowledgeItemsPage,
});
