import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { StudentShell } from "@/components/app/student-shell";
import { getAppAreaRedirect } from "@/features/auth/guards";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ context, location }) => {
    const redirectTo = getAppAreaRedirect(context.auth.accessState);

    if (redirectTo) {
      throw redirect({ search: { redirectTo: location.href }, to: redirectTo });
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
