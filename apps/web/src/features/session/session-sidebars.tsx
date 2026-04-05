import type { Scenario } from "@english-coach/contract";
import { ellipsize } from "../../lib/app-data";
import { Card } from "../../lib/app-shell";
import { useGoalProgress, useObservations } from "../../lib/livekit-packet-stores";

export function MissionSidebar({
  roomName,
  scenario,
  selectedCharacterIndex,
}: {
  roomName: string;
  scenario: Scenario;
  selectedCharacterIndex: number | undefined;
}) {
  const goalProgress = useGoalProgress(roomName);
  const selectedCharacter =
    selectedCharacterIndex === undefined ? undefined : scenario.characters[selectedCharacterIndex];
  const agentCharacter =
    selectedCharacterIndex === undefined ? undefined : scenario.characters[selectedCharacterIndex === 0 ? 1 : 0];
  const goals = goalProgress?.goals ?? scenario.goals.goals.map((goal) => ({ ...goal, status: "incomplete" as const }));
  const currentGoalId = goalProgress?.currentGoalId ?? goals.find((goal) => goal.status === "incomplete")?.id ?? "";

  return (
    <div className="grid content-start gap-4 xl:sticky xl:top-4">
      <Card className="grid gap-4 p-5">
        <div className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Scene</span>
          <h2 className="text-xl text-slate-950">{scenario.title}</h2>
          <p className="text-sm leading-7 text-slate-600">{scenario.setting}</p>
        </div>
        <div className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">You</span>
            <span>{selectedCharacter?.name ?? "Not selected"}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Agent</span>
            <span>{agentCharacter?.name ?? "Pending"}</span>
          </div>
        </div>
      </Card>

      <Card className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl text-slate-950">Mission cues</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Live progress</span>
        </div>
        <div className="grid gap-3">
          {goals.map((goal) => {
            const isCurrent = goal.id === currentGoalId;
            const isComplete = goal.status === "complete";
            const slotChips = scenario.goals.goals.find((item) => item.id === goal.id)?.logic.required_slots ?? [];

            return (
              <div
                className={`grid gap-3 rounded-[20px] border px-4 py-4 transition ${
                  isComplete
                    ? "border-emerald-300 bg-emerald-100"
                    : isCurrent
                      ? "border-amber-300 bg-amber-100"
                      : "border-slate-200 bg-slate-50"
                }`}
                key={goal.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <span className="text-sm font-medium text-slate-900">{goal.description}</span>
                    {goal.optional ? (
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Optional</span>
                    ) : null}
                  </div>
                  <span className="text-lg">{isComplete ? "✓" : isCurrent ? "•" : "○"}</span>
                </div>
                {slotChips.length ? (
                  <div className="flex flex-wrap gap-2">
                    {slotChips.map((slot) => {
                      const filledValue = goalProgress?.filledSlots[slot];

                      return (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.15em] ${
                            filledValue
                              ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                          key={slot}
                        >
                          {filledValue ? `${slot}: ${filledValue}` : slot}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function ObservationsSidebar({ roomName, contextDocument }: { roomName: string; contextDocument?: string }) {
  const observations = useObservations(roomName);

  return (
    <Card className="grid content-start gap-4 p-5 xl:sticky xl:top-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl text-slate-950">Follow-up prompts</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Worker packets</span>
        </div>
        <p className="text-sm leading-7 text-slate-600">
          The worker appends short prompts here every few turns so the learner can ask the agent about them.
        </p>
      </div>
      {contextDocument ? (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Context preview</p>
          <p className="mt-2 leading-7">{ellipsize(contextDocument, 180)}</p>
        </div>
      ) : null}
      <div className="grid max-h-[32rem] gap-3 overflow-auto pr-1">
        {observations.items.length ? (
          observations.items.map((item) => (
            <div
              className="rounded-[20px] border border-emerald-300 bg-emerald-100 p-4"
              key={`${item.sessionHistoryId}:${item.promptKind}:${item.prompt}`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-700">{item.promptKind}</p>
              <p className="mt-2 text-sm leading-7 text-emerald-900">{item.prompt}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No live prompts yet.
          </div>
        )}
      </div>
    </Card>
  );
}
