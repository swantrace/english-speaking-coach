import { Badge } from "@english-coach/ui";
import { MetricCard } from "@/components/app/metric-card";
import { formatDate } from "@/lib/dates";
import { formatCommunicativeFunction, formatFixednessLevel, formatSyntaxRole } from "@/lib/format";
import type { KnowledgeDetailView } from "../types";

interface KnowledgeSummaryCardProps {
  knowledge: KnowledgeDetailView;
}

function formatMetaValue(value: string | null) {
  return value ?? "Not specified";
}

export function KnowledgeSummaryCard({ knowledge }: KnowledgeSummaryCardProps) {
  return (
    <section className="space-y-5">
      <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{knowledge.pattern}</Badge>
              <Badge variant="outline">
                {knowledge.senses.length.toLocaleString()} sense{knowledge.senses.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              This summary keeps the core metadata visible while you scan sense definitions and jump back to the
              sessions where the pattern appeared.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">First learned</p>
              <p className="mt-1 text-slate-950">{formatDate(knowledge.firstLearnedAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Last seen</p>
              <p className="mt-1 text-slate-950">{formatDate(knowledge.lastSeenAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Syntax role</p>
              <p className="mt-1 text-slate-950">
                {formatMetaValue(knowledge.syntaxRole ? formatSyntaxRole(knowledge.syntaxRole) : null)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Fixedness</p>
              <p className="mt-1 text-slate-950">
                {formatMetaValue(knowledge.fixednessLevel ? formatFixednessLevel(knowledge.fixednessLevel) : null)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Communicative function</p>
              <p className="mt-1 text-slate-950">
                {formatMetaValue(
                  knowledge.communicativeFunction ? formatCommunicativeFunction(knowledge.communicativeFunction) : null,
                )}
              </p>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          helperText="Total learner-visible mentions across all reviewed sessions."
          label="Occurrences"
          value={knowledge.occurrenceCount.toLocaleString()}
        />
        <MetricCard
          helperText="Distinct completed sessions that contained this pattern."
          label="Sessions"
          value={knowledge.sessionCount.toLocaleString()}
        />
        <MetricCard
          helperText="Sense definitions currently attached to this knowledge item."
          label="Senses"
          value={knowledge.senses.length.toLocaleString()}
        />
      </div>
    </section>
  );
}
