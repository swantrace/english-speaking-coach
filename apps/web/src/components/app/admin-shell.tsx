import { BookOpen, ClipboardList, FolderKanban, LayoutDashboard, Link2, Sparkles, Users } from "@english-coach/ui";
import type { PropsWithChildren } from "react";
import { normalizeAdminScenarioSearch } from "@/features/scenario/admin-scenario-search";
import { DashboardShell } from "./dashboard-shell";

export function AdminShell({ children }: PropsWithChildren) {
  return (
    <DashboardShell
      items={[
        { icon: LayoutDashboard, label: "Overview", to: "/admin" },
        { icon: Users, label: "Users", search: { page: 1 }, to: "/admin/users" },
        { icon: Sparkles, label: "AI requests", search: { page: 1, pageSize: 20 }, to: "/admin/ai-requests" },
        { icon: ClipboardList, label: "Submissions", to: "/admin/submissions" },
        { icon: FolderKanban, label: "Scenarios", search: normalizeAdminScenarioSearch({}), to: "/admin/scenarios" },
        { icon: BookOpen, label: "Knowledge", to: "/admin/knowledge" },
        { icon: Link2, label: "Occurrences", search: { status: "proposed" }, to: "/admin/occurrences" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
