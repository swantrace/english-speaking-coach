import { Link } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { normalizeAdminScenarioSearch } from "@/features/scenario/admin-scenario-search";
import { AppShell } from "./app-shell";

export function AdminShell({ children }: PropsWithChildren) {
  return (
    <AppShell
      title="Admin"
      description="Foundation layout for future admin feature slices."
      navigation={
        <nav className="flex flex-col gap-2 text-sm text-slate-700">
          <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/admin">
            Overview
          </Link>
          <Link className="rounded-full px-3 py-2 hover:bg-stone-100" search={{ page: 1 }} to="/admin/users">
            Users
          </Link>
          <Link
            className="rounded-full px-3 py-2 hover:bg-stone-100"
            search={normalizeAdminScenarioSearch({})}
            to="/admin/scenarios"
          >
            Scenarios
          </Link>
          <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/admin/knowledge">
            Knowledge
          </Link>
        </nav>
      }
    >
      {children}
    </AppShell>
  );
}
