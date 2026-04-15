import { Button, ChevronLeft, ChevronRight, cn, PanelLeft } from "@english-coach/ui";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType, PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";

type LucideIcon = ComponentType<{ className?: string }>;

const SIDEBAR_COLLAPSED_STORAGE_KEY = "english-coach.sidebar-collapsed";

export interface DashboardNavItem {
  icon: LucideIcon;
  label: string;
  to: string;
  search?: Record<string, unknown>;
}

interface DashboardShellProps extends PropsWithChildren {
  items: DashboardNavItem[];
}

function isItemActive(pathname: string, itemPath: string) {
  if (itemPath === "/admin" || itemPath === "/app") {
    return pathname === itemPath;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function DashboardShell({ children, items }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    const persistedState = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    setIsCollapsed(persistedState === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: we only want to close the mobile sidebar on pathname changes, not on items changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        isActive: isItemActive(pathname, item.to),
      })),
    [items, pathname],
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4.25rem)] w-full max-w-[1680px] gap-4 px-3 py-4 lg:px-4">
      {isMobileOpen ? (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-20 left-3 z-40 flex flex-col rounded-[0.25rem] border border-stone-200/80 bg-white/95 p-3 shadow-xl backdrop-blur transition-all duration-200 ease-out lg:sticky lg:inset-auto lg:left-auto lg:top-4 lg:z-auto lg:h-[calc(100vh-6.25rem)] lg:shadow-sm",
          isMobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)] lg:translate-x-0",
          isCollapsed ? "w-20" : "w-72",
        )}
      >
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                  item.isActive
                    ? "bg-slate-950 text-white shadow-sm [&_*]:text-white"
                    : "text-slate-600 hover:bg-stone-100 hover:text-slate-950",
                  isCollapsed ? "justify-center px-2" : "justify-start",
                )}
                key={item.to}
                search={item.search}
                to={item.to}
              >
                <Icon className="size-4 shrink-0" />
                <span
                  className={cn(
                    "truncate transition-all",
                    isCollapsed ? "w-0 opacity-0 lg:pointer-events-none hidden" : "opacity-100",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 rounded-[0.25rem] border border-stone-200/80 bg-white/85 shadow-sm backdrop-blur">
        <div className="sticky top-0 z-20 flex items-center border-b border-stone-200/80 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
          <Button
            className="size-9 rounded-xl border-stone-200 shadow-none"
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) {
                setIsCollapsed((current) => !current);
                return;
              }

              setIsMobileOpen((current) => !current);
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            {isCollapsed ? (
              <ChevronRight className="hidden size-4 lg:block" />
            ) : (
              <ChevronLeft className="hidden size-4 lg:block" />
            )}
            <PanelLeft className="size-4 lg:hidden" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>

        <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
