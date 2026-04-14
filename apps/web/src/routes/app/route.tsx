import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { StudentShell } from "@/components/app/student-shell";
import { getAppAreaRedirect } from "@/features/auth/guards";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ context }) => {
    const redirectTo = getAppAreaRedirect(context.auth.accessState);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <StudentShell>
      <Outlet />
    </StudentShell>
  );
}
