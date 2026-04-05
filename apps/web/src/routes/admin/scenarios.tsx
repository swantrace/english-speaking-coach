import { createFileRoute } from "@tanstack/react-router";
import { adminScenariosSearchSchema } from "../../lib/app-data";

export const Route = createFileRoute("/admin/scenarios")({
  validateSearch: (search) => adminScenariosSearchSchema.parse(search),
});
