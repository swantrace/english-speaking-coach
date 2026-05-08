import { createFileRoute, redirect } from "@tanstack/react-router";
import { RejectedState } from "@/features/auth/components/rejected-state";
import { getRejectedPageRedirect } from "@/features/auth/guards";
import { parseAuthRedirectSearch } from "@/features/auth/redirect-search";

export const Route = createFileRoute("/(auth)/rejected")({
  validateSearch: parseAuthRedirectSearch,
  beforeLoad: ({ context, search }) => {
    const redirectTo = getRejectedPageRedirect(context.auth.accessState, search.redirectTo);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <RejectedState />;
}
