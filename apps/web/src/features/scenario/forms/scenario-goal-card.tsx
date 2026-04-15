import { Button } from "@english-coach/ui";
import type { Control } from "react-hook-form";
import { SwitchField } from "@/components/form/switch-field";
import { TagInputField } from "@/components/form/tag-input-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import type { ScenarioFormValues } from "../types";

interface ScenarioGoalCardProps {
  control: Control<ScenarioFormValues>;
  goalIndex: number;
  onRemove: () => void;
  removeDisabled?: boolean;
}

export function ScenarioGoalCard({ control, goalIndex, onRemove, removeDisabled = false }: ScenarioGoalCardProps) {
  const goalPath = `goals.goals.${goalIndex}` as const;

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50/40 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg text-slate-950">Goal {goalIndex + 1}</h3>
          <p className="text-sm text-slate-600">Keep goal logic aligned to the shared intents and slots above.</p>
        </div>

        <Button disabled={removeDisabled} onClick={onRemove} type="button" variant="outline">
          Remove goal
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TextField control={control} label="Goal ID" name={`${goalPath}.id`} placeholder="ask-for-room-change" />
        <SwitchField
          control={control}
          description="Optional goals enrich the scenario without blocking completion."
          label="Optional goal"
          name={`${goalPath}.optional`}
        />
      </div>

      <TextareaField
        control={control}
        label="Goal description"
        minRows={3}
        name={`${goalPath}.description`}
        placeholder="Learner asks to move to a quieter room and explains why."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TagInputField
          control={control}
          description="Reference the top-level intents list."
          label="Required intents"
          name={`${goalPath}.logic.required_intents`}
          placeholder="Add required intent"
        />
        <TagInputField
          control={control}
          description="Reference the top-level slots list."
          label="Required slots"
          name={`${goalPath}.logic.required_slots`}
          placeholder="Add required slot"
        />
      </div>
    </div>
  );
}
