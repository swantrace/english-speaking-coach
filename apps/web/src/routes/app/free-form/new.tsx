import { Button } from "@english-coach/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { FreeFormSessionForm } from "@/features/session/forms/free-form-session-form";

export const Route = createFileRoute("/app/free-form/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        }
        description="Add the context you want to practice from, then move straight into the live session route."
        eyebrow="Free-Form Practice"
        title="Start a free-form session"
      />

      <FreeFormSessionForm
        onSuccess={(result) =>
          navigate({
            params: result.liveRoute.params,
            to: result.liveRoute.to,
          })
        }
      />
    </div>
  );
}
