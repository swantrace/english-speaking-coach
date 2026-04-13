import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/(public)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AppShell
      title="Welcome"
      description="Foundation route group for public pages and future marketing or landing surfaces."
    >
      <Outlet />
    </AppShell>
  );
}
