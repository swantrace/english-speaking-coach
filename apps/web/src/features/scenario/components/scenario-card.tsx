import { Badge, Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import type { ScenarioListItem } from "../types";

interface ScenarioCardProps {
  scenario: ScenarioListItem;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  return (
    <article className="flex h-full flex-col rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {scenario.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-xl text-slate-950">{scenario.title}</h3>
          <p className="text-sm leading-6 text-slate-600">{scenario.setting}</p>
        </div>
        <p className="text-sm text-slate-500">
          Roles: {scenario.characterNames[0]} and {scenario.characterNames[1]}
        </p>
      </div>
      <div className="mt-6 flex flex-1 items-end">
        <Button asChild className="w-full" variant="outline">
          <Link params={{ scenarioId: scenario.id }} to="/app/scenarios/$scenarioId">
            View details
          </Link>
        </Button>
      </div>
    </article>
  );
}
