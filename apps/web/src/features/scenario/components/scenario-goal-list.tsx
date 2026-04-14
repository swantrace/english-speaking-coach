import { Badge } from "@english-coach/ui";
import type { ScenarioDetail } from "../types";

interface ScenarioGoalListProps {
  scenario: ScenarioDetail;
}

export function ScenarioGoalList({ scenario }: ScenarioGoalListProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {scenario.goalDimensions.intents.length > 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Intents</p>
            <p className="mt-2 text-sm text-slate-700">{scenario.goalDimensions.intents.join(", ")}</p>
          </div>
        ) : null}
        {scenario.goalDimensions.slots.length > 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Slots</p>
            <p className="mt-2 text-sm text-slate-700">{scenario.goalDimensions.slots.join(", ")}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {scenario.goals.map((goal) => (
          <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm" key={goal.id}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg text-slate-950">{goal.description}</h3>
              <Badge variant={goal.optional ? "outline" : "secondary"}>{goal.optional ? "Optional" : "Required"}</Badge>
            </div>
            {goal.requiredIntents.length > 0 ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Required intents: {goal.requiredIntents.join(", ")}
              </p>
            ) : null}
            {goal.requiredSlots.length > 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">Required slots: {goal.requiredSlots.join(", ")}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
