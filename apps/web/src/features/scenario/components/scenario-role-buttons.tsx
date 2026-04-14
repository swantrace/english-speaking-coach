import { Alert, AlertDescription, Button } from "@english-coach/ui";
import { useNavigate } from "@tanstack/react-router";
import { useCreateRolePlaySessionMutation } from "@/features/session/mutations";
import type { ScenarioCharacterView } from "../types";

interface ScenarioRoleButtonsProps {
  characters: [ScenarioCharacterView, ScenarioCharacterView];
  scenarioId: string;
}

export function ScenarioRoleButtons({ characters, scenarioId }: ScenarioRoleButtonsProps) {
  const navigate = useNavigate();
  const createRolePlaySessionMutation = useCreateRolePlaySessionMutation({
    onSuccess: (result) =>
      navigate({
        params: result.liveRoute.params,
        to: result.liveRoute.to,
      }),
  });

  const activeRoleIndex = createRolePlaySessionMutation.variables?.selectedCharacterIndex ?? null;

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
              disabled={createRolePlaySessionMutation.isPending}
              className="mt-5 w-full"
              onClick={() =>
                createRolePlaySessionMutation.mutate({
                  scenarioId,
                  selectedCharacterIndex: character.index,
                })
              }
              type="button"
            >
              {createRolePlaySessionMutation.isPending && activeRoleIndex === character.index
                ? `Starting ${character.name}...`
                : `Practice as ${character.name}`}
            </Button>
          </article>
        ))}
      </div>

      {createRolePlaySessionMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{createRolePlaySessionMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
