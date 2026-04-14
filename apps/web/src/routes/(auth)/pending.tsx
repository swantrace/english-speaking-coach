import { createFileRoute, redirect } from "@tanstack/react-router";
import { PendingState } from "@/features/auth/components/pending-state";
import { getPendingPageRedirect } from "@/features/auth/guards";

export const Route = createFileRoute("/(auth)/pending")({
  beforeLoad: ({ context }) => {
    const redirectTo = getPendingPageRedirect(context.auth.accessState);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <PendingState />;
}
