import { createFileRoute } from "@tanstack/react-router";
import { AdminKnowledgeItemsPage } from "../../features/admin/admin-knowledge-page";
import { adminKnowledgeItemsSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/admin/knowledge-items")({
  component: AdminKnowledgeItemsPage,
  validateSearch: (search) => adminKnowledgeItemsSearchSchema.parse(search),
});
