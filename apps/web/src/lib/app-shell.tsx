import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { isAdmin, useViewer } from "./app-data";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-slate-950/45 p-6 shadow-[0_24px_120px_rgba(8,15,30,0.32)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

export function PageIntro({
  badge,
  title,
  description,
  aside,
}: {
  badge: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <Card className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
      <div className="grid gap-3">
        <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
          {badge}
        </span>
        <h1 className="max-w-4xl text-balance text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="max-w-3xl text-pretty text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </Card>
  );
}

export function PageState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="grid place-items-center px-6 py-16 text-center">
      <div className="grid max-w-xl gap-3">
        <h2 className="text-2xl text-white">{title}</h2>
        <p className="text-sm leading-7 text-slate-300">{description}</p>
      </div>
    </Card>
  );
}

export function LoadingPanel({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="grid place-items-center px-6 py-12 text-center">
      <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200">{label}</div>
    </Card>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const viewer = useViewer();

  useEffect(() => {
    if (!viewer.isPending && !viewer.data?.user) {
      void navigate({ replace: true, to: "/login" });
    }
  }, [navigate, viewer.data?.user, viewer.isPending]);

  if (viewer.isPending) {
    return <LoadingPanel label="Checking session..." />;
  }

  if (!viewer.data?.user) {
    return null;
  }

  return <>{children}</>;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const viewer = useViewer();

  useEffect(() => {
    if (!viewer.isPending && !isAdmin(viewer.data?.user ?? null)) {
      void navigate({
        replace: true,
        search: { page: 1, pageSize: 12, sortBy: "updatedAt", sortDirection: "desc" },
        to: "/scenarios",
      });
    }
  }, [navigate, viewer.data?.user, viewer.isPending]);

  if (viewer.isPending) {
    return <LoadingPanel label="Checking permissions..." />;
  }

  if (!isAdmin(viewer.data?.user ?? null)) {
    return null;
  }

  return <>{children}</>;
}
