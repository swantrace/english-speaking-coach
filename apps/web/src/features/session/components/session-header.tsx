import { Badge } from "@english-coach/ui";
import dayjs from "dayjs";
import { selectConnectionBannerState } from "../runtime/selectors";
import { useSessionRuntimeStore } from "../runtime/store";
import type { LiveSessionBootstrap } from "../types";

interface SessionHeaderProps {
  bootstrap: LiveSessionBootstrap;
}

function getModeLabel(sessionType: LiveSessionBootstrap["sessionType"]) {
  return sessionType === "role-play" ? "Role-Play" : "Free-Form";
}

export function SessionHeader({ bootstrap }: SessionHeaderProps) {
  const { status } = useSessionRuntimeStore(selectConnectionBannerState);
  const subtitle =
    bootstrap.sessionType === "role-play"
      ? bootstrap.scenario.setting
      : "Practice with your own notes, article, or speaking brief in a live coaching room.";

  return (
    <header className="rounded-[2rem] border border-stone-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,231,0.92))] p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getModeLabel(bootstrap.sessionType)}</Badge>
            <Badge variant="outline">{status}</Badge>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl text-slate-950">
              {bootstrap.sessionType === "role-play" ? bootstrap.scenario.title : bootstrap.context.summary}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
        </div>

        <div className="shrink-0 rounded-[1.5rem] border border-stone-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Started</p>
          <p className="mt-2 text-base font-medium text-slate-950">
            {dayjs(bootstrap.startedAt).format("MMM D, YYYY h:mm A")}
          </p>
        </div>
      </div>
    </header>
  );
}
