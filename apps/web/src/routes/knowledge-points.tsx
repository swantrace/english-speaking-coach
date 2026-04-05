import { createFileRoute } from "@tanstack/react-router";
import { knowledgePointsSearchSchema } from "../lib/app-data";

export const Route = createFileRoute("/knowledge-points")({
  validateSearch: (search) => knowledgePointsSearchSchema.parse(search),
});
