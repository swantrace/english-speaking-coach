import { cn } from "@english-coach/ui";
import type { ExampleDialogueTurn } from "../types";

interface ScenarioExampleDialogueProps {
  turns: ExampleDialogueTurn[];
}

export function ScenarioExampleDialogue({ turns }: ScenarioExampleDialogueProps) {
  return (
    <div className="space-y-3">
      {turns.map((turn) => (
        <article
          className={cn(
            "rounded-[1.5rem] border p-4 shadow-sm",
            turn.characterIndex === 0 ? "border-amber-200 bg-amber-50/70" : "border-sky-200 bg-sky-50/70",
          )}
          key={turn.id}
        >
          <p className="text-sm font-semibold text-slate-950">{turn.speakerName}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{turn.text}</p>
        </article>
      ))}
    </div>
  );
}
