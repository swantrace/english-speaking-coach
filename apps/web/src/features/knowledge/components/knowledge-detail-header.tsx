import { Badge, Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { formatCommunicativeFunction, formatFixednessLevel, formatPatternType } from "@/lib/format";
import type { KnowledgeDetailView } from "../types";

interface KnowledgeDetailHeaderProps {
  knowledge: KnowledgeDetailView;
}

export function KnowledgeDetailHeader({ knowledge }: KnowledgeDetailHeaderProps) {
  return (
    <header className="rounded-[2rem] border border-stone-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,231,0.92))] p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {knowledge.patternType ? (
              <Badge variant="secondary">{formatPatternType(knowledge.patternType)}</Badge>
            ) : null}
            {knowledge.fixednessLevel ? (
              <Badge variant="outline">{formatFixednessLevel(knowledge.fixednessLevel)}</Badge>
            ) : null}
            {knowledge.communicativeFunction ? (
              <Badge variant="outline">{formatCommunicativeFunction(knowledge.communicativeFunction)}</Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Knowledge review</p>
            <h1 className="text-3xl text-slate-950">{knowledge.pattern}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Review the senses and learner-visible occurrences of this pattern across completed practice sessions.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button asChild variant="outline">
            <Link to="/app/knowledge">Back to knowledge</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
