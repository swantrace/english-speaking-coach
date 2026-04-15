import { BookOpen, History, Home, Sparkles } from "@english-coach/ui";
import type { PropsWithChildren } from "react";
import { DashboardShell } from "./dashboard-shell";

export function StudentShell({ children }: PropsWithChildren) {
  return (
    <DashboardShell
      items={[
        { icon: Home, label: "Home", to: "/app" },
        { icon: History, label: "Sessions", to: "/app/sessions" },
        { icon: Sparkles, label: "Scenarios", to: "/app/scenarios" },
        { icon: BookOpen, label: "Knowledge", to: "/app/knowledge" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
