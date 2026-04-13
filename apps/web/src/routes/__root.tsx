import type { ErrorComponentProps } from "@tanstack/react-router";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { AppRouterContext } from "@/app/route-context";

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFoundComponent,
});

function RootComponent() {
  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,232,209,0.65),_transparent_38%),linear-gradient(180deg,_#f8f4ec_0%,_#f3efe7_100%)]">
        <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
            <Link className="text-lg font-semibold tracking-tight text-slate-950" to="/">
              English Coach
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/">
                Public
              </Link>
              <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/login">
                Login
              </Link>
              <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/app">
                App
              </Link>
              <Link className="rounded-full px-3 py-2 hover:bg-stone-100" to="/admin">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <Outlet />
      </div>
      <TanStackRouterDevtools />
    </>
  );
}

function RootErrorComponent({ error }: ErrorComponentProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-600">Application Error</p>
        <h1 className="mt-4 text-3xl text-slate-950">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{error.message}</p>
      </div>
    </div>
  );
}

function RootNotFoundComponent() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Not Found</p>
        <h1 className="mt-4 text-3xl text-slate-950">That page does not exist</h1>
        <Link className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm text-white" to="/">
          Return home
        </Link>
      </div>
    </div>
  );
}
