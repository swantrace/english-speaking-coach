import { BookOpen, History, Home, Plus, Sparkles, UserCircle, Volume2 } from "@english-coach/ui";
import type { PropsWithChildren } from "react";
import { DashboardShell } from "./dashboard-shell";

export function StudentShell({ children }: PropsWithChildren) {
  return (
    <DashboardShell
      items={[
        { icon: Home, label: "Home", to: "/app" },
        { icon: Plus, label: "Free Form", to: "/app/free-form/new" },
        { icon: History, label: "Sessions", to: "/app/sessions" },
        { icon: Volume2, label: "Conversations", to: "/app/conversations" },
        { icon: Sparkles, label: "Scenarios", to: "/app/scenarios" },
        { icon: BookOpen, label: "Knowledge", to: "/app/knowledge" },
        { icon: UserCircle, label: "Profile", to: "/app/profile" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
