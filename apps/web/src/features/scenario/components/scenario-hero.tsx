import { Badge } from "@english-coach/ui";
import type { ScenarioDetail } from "../types";

interface ScenarioHeroProps {
  scenario: ScenarioDetail;
}

export function ScenarioHero({ scenario }: ScenarioHeroProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_20rem]">
      <div className="rounded-[1.75rem] border border-stone-200 bg-stone-50/60 p-6">
        <div className="flex flex-wrap gap-2">
          {scenario.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <h2 className="mt-4 text-3xl text-slate-950">{scenario.title}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">{scenario.setting}</p>
      </div>

      {scenario.imageUrl ? (
        <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
          <img alt={scenario.title} className="h-full w-full object-cover" src={scenario.imageUrl} />
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-stone-300 bg-stone-50/70 p-6">
          <p className="text-sm font-medium text-slate-700">Scenario image</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">No image has been attached for this scenario yet.</p>
        </div>
      )}
    </section>
  );
}
