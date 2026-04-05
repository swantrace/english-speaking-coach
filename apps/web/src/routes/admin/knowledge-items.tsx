import { createFileRoute } from "@tanstack/react-router";
import { adminKnowledgeItemsSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/admin/knowledge-items")({
  validateSearch: (search) => adminKnowledgeItemsSearchSchema.parse(search),
});
