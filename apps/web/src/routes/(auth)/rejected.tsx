import { createFileRoute, redirect } from "@tanstack/react-router";
import { RejectedState } from "@/features/auth/components/rejected-state";
import { getRejectedPageRedirect } from "@/features/auth/guards";

export const Route = createFileRoute("/(auth)/rejected")({
  beforeLoad: ({ context }) => {
    const redirectTo = getRejectedPageRedirect(context.auth.accessState);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <RejectedState />;
}
