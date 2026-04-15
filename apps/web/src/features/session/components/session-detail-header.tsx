import { Badge, Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { formatDateTime } from "@/lib/dates";
import { formatDurationSeconds, formatSessionType } from "@/lib/format";
import type { SessionHistoryDetailView } from "../types";

interface SessionDetailHeaderProps {
  session: SessionHistoryDetailView;
}

export function SessionDetailHeader({ session }: SessionDetailHeaderProps) {
  return (
    <header className="rounded-[2rem] border border-stone-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,231,0.92))] p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatSessionType(session.sessionType)}</Badge>
            <Badge variant="outline">{formatDurationSeconds(session.durationSeconds)}</Badge>
            {session.scenarioSetting ? <Badge variant="outline">{session.scenarioSetting}</Badge> : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Post-session review</p>
            <h1 className="text-3xl text-slate-950">{session.title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Review the transcript, coaching summary, errors, and linked knowledge items from this completed practice
              session.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button asChild variant="outline">
            <Link to="/app/sessions">Back to sessions</Link>
          </Button>

          <div className="rounded-[1.5rem] border border-stone-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Completed</p>
            <p className="mt-2 text-base font-medium text-slate-950">{formatDateTime(session.date)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
