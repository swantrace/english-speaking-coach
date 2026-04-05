import { createLazyFileRoute } from "@tanstack/react-router";
import { AdminKnowledgeItemsPage } from "../../features/admin/admin-knowledge-page";

export const Route = createLazyFileRoute("/admin/knowledge-items")({
  component: AdminKnowledgeItemsPage,
});
