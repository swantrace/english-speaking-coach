import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getAuthAreaRedirect } from "@/features/auth/guards";
import { parseAuthRedirectSearch } from "@/features/auth/redirect-search";

export const Route = createFileRoute("/(auth)/signup")({
  validateSearch: parseAuthRedirectSearch,
  beforeLoad: ({ context, search }) => {
    const redirectTo = getAuthAreaRedirect(context.auth.accessState, search.redirectTo);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <SignupForm />;
}
