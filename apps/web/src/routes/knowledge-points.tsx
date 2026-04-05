import { createFileRoute } from "@tanstack/react-router";
import { KnowledgePointsPage } from "../features/knowledge/knowledge-points-page";
import { knowledgePointsSearchSchema } from "../lib/app-data";

export const Route = createFileRoute("/knowledge-points")({
  component: KnowledgePointsPage,
  validateSearch: (search) => knowledgePointsSearchSchema.parse(search),
});
