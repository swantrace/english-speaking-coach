import { createFileRoute } from "@tanstack/react-router";
import { AdminKnowledgeItemsPage } from "../../features/admin/admin-pages";

export const Route = createFileRoute("/admin/knowledge-items")({
  component: AdminKnowledgeItemsPage,
});
