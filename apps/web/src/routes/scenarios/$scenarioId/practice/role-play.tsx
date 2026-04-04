import { createFileRoute, redirect } from "@tanstack/react-router";
import { rolePlaySearchSchema } from "../../../../lib/app-data";

export const Route = createFileRoute("/scenarios/$scenarioId/practice/role-play")({
  beforeLoad: ({ params, search }) => {
    const parsedSearch = rolePlaySearchSchema.parse(search);

    throw redirect({
      params: () => ({ scenarioId: params.scenarioId }),
      search: () => ({ character: parsedSearch.character }),
      to: "/scenarios/$scenarioId",
    });
  },
  component: () => null,
  validateSearch: (search) => rolePlaySearchSchema.parse(search),
});
