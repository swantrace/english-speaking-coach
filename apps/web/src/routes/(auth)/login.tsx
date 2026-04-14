import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth/components/login-form";
import { getAuthAreaRedirect } from "@/features/auth/guards";

export const Route = createFileRoute("/(auth)/login")({
  beforeLoad: ({ context }) => {
    const redirectTo = getAuthAreaRedirect(context.auth.accessState);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <LoginForm />;
}
