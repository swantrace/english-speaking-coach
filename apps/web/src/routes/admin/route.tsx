import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/admin-shell";
import { getAdminAreaRedirect } from "@/features/auth/guards";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    const redirectTo = getAdminAreaRedirect(context.auth.accessState);

    if (redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
