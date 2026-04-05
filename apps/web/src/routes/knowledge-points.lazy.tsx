import { createLazyFileRoute } from "@tanstack/react-router";
import { KnowledgePointsPage } from "../features/knowledge/knowledge-points-page";

export const Route = createLazyFileRoute("/knowledge-points")({
  component: KnowledgePointsPage,
});
