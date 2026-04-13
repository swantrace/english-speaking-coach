import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/(auth)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AppShell
      title="Access"
      description="Foundation route group for authentication entry points and future bootstrap states."
    >
      <Outlet />
    </AppShell>
  );
}
