import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StudentShell } from "@/components/app/student-shell";

export const Route = createFileRoute("/app")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <StudentShell>
      <Outlet />
    </StudentShell>
  );
}
