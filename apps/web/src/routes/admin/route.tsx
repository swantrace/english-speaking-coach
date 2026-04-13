import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/admin-shell";

export const Route = createFileRoute("/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
