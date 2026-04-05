import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { isAdmin, useViewer } from "./app-data";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[28px] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_80px_rgba(148,163,184,0.18)] backdrop-blur-xl ${className}`}
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
        <span className="w-fit rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-800">
          {badge}
        </span>
        <h1 className="max-w-4xl text-balance text-4xl leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="max-w-3xl text-pretty text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </Card>
  );
}

export function PageState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="grid place-items-center px-6 py-16 text-center">
      <div className="grid max-w-xl gap-3">
        <h2 className="text-2xl text-slate-950">{title}</h2>
        <p className="text-sm leading-7 text-slate-600">{description}</p>
      </div>
    </Card>
  );
}

export function LoadingPanel({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="grid place-items-center px-6 py-12 text-center">
      <div className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">{label}</div>
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
