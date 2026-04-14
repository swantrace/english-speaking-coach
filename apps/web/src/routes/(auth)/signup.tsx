import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getAuthAreaRedirect } from "@/features/auth/guards";

export const Route = createFileRoute("/(auth)/signup")({
  beforeLoad: ({ context }) => {
    const redirectTo = getAuthAreaRedirect(context.auth.accessState);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <SignupForm />;
}
