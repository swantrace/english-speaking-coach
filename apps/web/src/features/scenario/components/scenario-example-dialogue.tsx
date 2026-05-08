import { cn } from "@english-coach/ui";
import type { ExampleDialogueTurn } from "../types";

interface ScenarioExampleDialogueProps {
  turns: ExampleDialogueTurn[];
}

export function ScenarioExampleDialogue({ turns }: ScenarioExampleDialogueProps) {
  return (
    <ol className="divide-y divide-stone-200 border-y border-stone-200">
      {turns.map((turn) => (
        <li
          className={cn(
            "grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]",
            turn.characterIndex === 0 ? "text-amber-950" : "text-sky-950",
          )}
          key={turn.id}
        >
          <p className="text-sm font-semibold">{turn.speakerName}</p>
          <p className="text-sm leading-6 text-slate-700">{turn.text}</p>
        </li>
      ))}
    </ol>
  );
}
