import { Button } from "@english-coach/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  adminScenariosQueryKey,
  getAuthenticatedHomePath,
  historyQueryKey,
  isAdmin,
  knowledgePointsQueryKey,
  roleToneMap,
  scenariosQueryKey,
  useViewer,
  viewerQueryKey,
} from "../../lib/app-data";
import { authClient } from "../../lib/auth-client";

export function RootLayout() {
  const location = useLocation();
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const [signOutState, setSignOutState] = useState<"idle" | "submitting">("idle");
  const currentUser = viewer.data?.user ?? null;
  const isAuthenticated = Boolean(currentUser);
  const isLandingPage = location.pathname === "/";

  const navItems: Array<{
    label: string;
    to: "/scenarios" | "/free-form" | "/history" | "/knowledge-points" | "/admin/scenarios" | "/admin/knowledge-items";
  }> = [
    { label: "Scenarios", to: "/scenarios" as const },
    { label: "Free-form", to: "/free-form" as const },
    { label: "History", to: "/history" as const },
  ];

  if (!isAdmin(currentUser)) {
    navItems.push({ label: "Knowledge Points", to: "/knowledge-points" });
  }

  if (isAdmin(currentUser)) {
    navItems.push({ label: "Admin Scenarios", to: "/admin/scenarios" });
    navItems.push({ label: "Admin Knowledge", to: "/admin/knowledge-items" });
  }

  return (
    <div className="coach-light-theme relative min-h-screen overflow-hidden bg-[#f6f1e8] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_26%),radial-gradient(circle_at_left,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(160deg,_rgba(255,248,240,0.98),_rgba(245,239,229,0.98))]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[92rem] flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/88 px-5 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="text-xl font-semibold text-slate-950"
              to={isAuthenticated ? getAuthenticatedHomePath(currentUser) : "/"}
            >
              English Coach
            </Link>
            {currentUser ? (
              <span
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${roleToneMap[currentUser.role ?? "student"]}`}
              >
                {currentUser.role ?? "student"}
              </span>
            ) : null}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-between gap-4 lg:justify-end">
            {isAuthenticated ? (
              <nav className="flex flex-wrap items-center gap-2">
                {navItems.map((item) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                  return (
                    <Link
                      className={`rounded-full px-3 py-2 text-sm transition ${
                        active
                          ? "border border-amber-200 bg-amber-100 text-slate-900 shadow-sm"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                      key={item.to}
                      to={item.to}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : (
              <nav className="flex flex-wrap items-center gap-2">
                {isLandingPage ? (
                  <Button asChild variant="ghost">
                    <a href="#how-it-works">How it works</a>
                  </Button>
                ) : (
                  <Button asChild variant="ghost">
                    <Link to="/">Overview</Link>
                  </Button>
                )}
                <Button asChild>
                  <Link to="/login">Start practicing</Link>
                </Button>
              </nav>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              {isAuthenticated ? (
                <>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                    {currentUser?.name} · {currentUser?.email}
                  </span>
                  <Button
                    className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    disabled={signOutState === "submitting"}
                    onClick={() => {
                      setSignOutState("submitting");
                      void authClient
                        .signOut()
                        .then(async () => {
                          await queryClient.invalidateQueries({ queryKey: viewerQueryKey });
                          await queryClient.invalidateQueries({ queryKey: historyQueryKey });
                          await queryClient.invalidateQueries({ queryKey: knowledgePointsQueryKey });
                          await queryClient.invalidateQueries({ queryKey: scenariosQueryKey });
                          await queryClient.invalidateQueries({ queryKey: adminScenariosQueryKey });
                        })
                        .finally(() => {
                          setSignOutState("idle");
                        });
                    }}
                    variant="outline"
                  >
                    {signOutState === "submitting" ? "Signing out..." : "Sign out"}
                  </Button>
                </>
              ) : isLandingPage ? (
                <Button
                  asChild
                  className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                  variant="outline"
                >
                  <Link to="/login">Sign in</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
