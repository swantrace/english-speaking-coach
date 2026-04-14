import { Badge } from "@english-coach/ui";
import type { RolePlayScenarioSideContent, SessionGoalProgress } from "../types";

interface RoleplaySideContentProps {
  goalProgress: SessionGoalProgress | null;
  scenario: RolePlayScenarioSideContent;
}

export function RoleplaySideContent({ goalProgress, scenario }: RoleplaySideContentProps) {
  const learnerCharacter = scenario.characters[scenario.selectedCharacterIndex];
  const coachCharacter = scenario.characters[scenario.selectedCharacterIndex === 0 ? 1 : 0];
  const completedGoalIds = new Set(
    goalProgress?.goals.filter((goal) => goal.status === "complete").map((goal) => goal.id),
  );

  return (
    <div className="space-y-5">
      {scenario.imageUrl ? (
        <div className="overflow-hidden rounded-[1.5rem] border border-stone-200">
          <img alt={scenario.title} className="h-52 w-full object-cover" src={scenario.imageUrl} />
        </div>
      ) : null}

      <section className="space-y-3 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Scene</p>
        <h3 className="text-lg text-slate-950">{scenario.title}</h3>
        <p className="text-sm leading-6 text-slate-600">{scenario.setting}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        <article className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-950">Your role</p>
            <Badge variant="secondary">Learner</Badge>
          </div>
          <h4 className="mt-2 text-base text-slate-950">{learnerCharacter.name}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">{learnerCharacter.description}</p>
        </article>

        <article className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-950">Coach role</p>
            <Badge variant="outline">Virtual coach</Badge>
          </div>
          <h4 className="mt-2 text-base text-slate-950">{coachCharacter.name}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">{coachCharacter.description}</p>
        </article>
      </section>

      <section className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Goal progress</p>
            <p className="mt-1 text-sm text-slate-600">
              The UI stays conservative until the backend protocol publishes cleaner progress data.
            </p>
          </div>
          {goalProgress ? (
            <Badge variant="secondary">
              {goalProgress.goals.filter((goal) => goal.status === "complete").length}/{goalProgress.goals.length}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {scenario.goals.map((goal) => (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-3 py-3" key={goal.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">{goal.description}</p>
                <Badge variant={goal.optional ? "outline" : "secondary"}>
                  {completedGoalIds.has(goal.id) ? "Done" : goal.optional ? "Optional" : "Active"}
                </Badge>
              </div>
              {goalProgress?.currentGoalId === goal.id ? (
                <p className="mt-2 text-sm text-slate-600">
                  This is the current goal the role-play tracker is watching.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
