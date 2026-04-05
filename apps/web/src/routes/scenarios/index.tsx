import { createFileRoute } from "@tanstack/react-router";
import { learnerScenariosSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/scenarios/")({
  validateSearch: (search) => learnerScenariosSearchSchema.parse(search),
});
