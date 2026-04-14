import { Alert, AlertDescription, Button } from "@english-coach/ui";
import { startTransition, useState } from "react";
import type { ScenarioCharacterView } from "../types";

interface ScenarioRoleButtonsProps {
  characters: [ScenarioCharacterView, ScenarioCharacterView];
  scenarioId: string;
}

export function ScenarioRoleButtons({ characters, scenarioId }: ScenarioRoleButtonsProps) {
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<0 | 1 | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {characters.map((character) => (
          <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm" key={character.index}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Role {character.index + 1}
            </p>
            <h3 className="mt-3 text-xl text-slate-950">{character.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{character.description}</p>
            <Button
              className="mt-5 w-full"
              onClick={() =>
                startTransition(() => {
                  setSelectedRoleIndex(character.index);
                })
              }
              type="button"
            >
              Practice as {character.name}
            </Button>
          </article>
        ))}
      </div>

      {selectedRoleIndex !== null ? (
        <Alert>
          <AlertDescription>
            Temporary stub: this selection is ready to feed the future session-start payload with{" "}
            <code>
              {JSON.stringify({ scenarioId, selectedCharacterIndex: selectedRoleIndex, sessionType: "role-play" })}
            </code>
            . Live session creation will be wired in the next slice.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
