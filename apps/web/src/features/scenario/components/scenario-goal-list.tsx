import { Badge } from "@english-coach/ui";
import type { ScenarioDetail } from "../types";

interface ScenarioGoalListProps {
  scenario: ScenarioDetail;
}

export function ScenarioGoalList({ scenario }: ScenarioGoalListProps) {
  return (
    <ol className="space-y-1 border-l border-stone-200 pl-4">
      {scenario.goals.map((goal) => (
        <li className="relative pb-5 last:pb-0" key={goal.id}>
          <span className="absolute -left-[21px] top-2 size-2 rounded-full bg-slate-400" aria-hidden="true" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h3 className="max-w-3xl text-base leading-7 text-slate-950">{goal.description}</h3>
            <Badge className="w-fit" variant={goal.optional ? "outline" : "secondary"}>
              {goal.optional ? "Optional" : "Required"}
            </Badge>
          </div>

          <div className="mt-3 space-y-3 pl-4">
            <GoalBranch label="Intents" values={goal.requiredIntents} />
            <GoalBranch label="Slots" values={goal.requiredSlots} />
          </div>
        </li>
      ))}
    </ol>
  );
}

interface GoalBranchProps {
  label: string;
  values: string[];
}

function GoalBranch({ label, values }: GoalBranchProps) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="relative border-l border-stone-200 pl-4">
      <span className="absolute -left-px top-3 h-px w-3 bg-stone-200" aria-hidden="true" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <li className="rounded-sm bg-stone-100 px-2 py-1 text-xs text-slate-700" key={value}>
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}
