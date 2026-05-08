import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth/components/login-form";
import { getAuthAreaRedirect } from "@/features/auth/guards";
import { parseAuthRedirectSearch } from "@/features/auth/redirect-search";

export const Route = createFileRoute("/(auth)/login")({
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
  return <LoginForm />;
}
