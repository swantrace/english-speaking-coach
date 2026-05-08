import { createFileRoute, redirect } from "@tanstack/react-router";
import { PendingState } from "@/features/auth/components/pending-state";
import { getPendingPageRedirect } from "@/features/auth/guards";
import { parseAuthRedirectSearch } from "@/features/auth/redirect-search";

export const Route = createFileRoute("/(auth)/pending")({
  validateSearch: parseAuthRedirectSearch,
  beforeLoad: ({ context, search }) => {
    const redirectTo = getPendingPageRedirect(context.auth.accessState, search.redirectTo);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <PendingState />;
}
