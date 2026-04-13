import { Link } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { AppShell } from "./app-shell";

export function StudentShell({ children }: PropsWithChildren) {
  return (
    <AppShell
      title="Learning"
      description="Foundation layout for learner-facing routes and future session flows."
      navigation={
        <nav className="flex flex-col gap-2 text-sm text-slate-700">
          <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/app">
            Home
          </Link>
          <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/app/sessions">
            Sessions
          </Link>
          <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/app/scenarios">
            Scenarios
          </Link>
          <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/app/knowledge">
            Knowledge
          </Link>
        </nav>
      }
    >
      {children}
    </AppShell>
  );
}
