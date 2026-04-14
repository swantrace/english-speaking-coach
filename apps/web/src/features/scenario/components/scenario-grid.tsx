import type { ScenarioListItem } from "../types";
import { ScenarioCard } from "./scenario-card";

interface ScenarioGridProps {
  items: ScenarioListItem[];
}

export function ScenarioGrid({ items }: ScenarioGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((scenario) => (
        <ScenarioCard key={scenario.id} scenario={scenario} />
      ))}
    </div>
  );
}
