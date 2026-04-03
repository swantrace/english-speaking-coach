import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/scenarios/$scenarioId/practice/free-form")({
  beforeLoad: ({ params }) => {
    throw redirect({
      search: { scenarioId: params.scenarioId },
      to: "/free-form",
    });
  },
});
