import { Button } from "@english-coach/ui";
import { type Control, useFieldArray } from "react-hook-form";
import { TagInputField } from "@/components/form/tag-input-field";
import type { ScenarioFormValues } from "../types";
import { ScenarioGoalCard } from "./scenario-goal-card";

function createGoal() {
  return {
    description: "",
    id: crypto.randomUUID(),
    logic: {
      required_intents: [],
      required_slots: [],
    },
    optional: false,
  };
}

interface ScenarioGoalsFieldArrayProps {
  control: Control<ScenarioFormValues>;
}

export function ScenarioGoalsFieldArray({ control }: ScenarioGoalsFieldArrayProps) {
  const { append, fields, remove } = useFieldArray({
    control,
    keyName: "fieldId",
    name: "goals.goals",
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <TagInputField
          control={control}
          description="Reusable intents that the goal logic can reference."
          label="Intents"
          name="goals.intents"
          placeholder="Add intent"
        />
        <TagInputField
          control={control}
          description="Reusable slot labels that the goal logic can reference."
          label="Slots"
          name="goals.slots"
          placeholder="Add slot"
        />
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <ScenarioGoalCard
            control={control}
            goalIndex={index}
            key={field.fieldId}
            onRemove={() => remove(index)}
            removeDisabled={fields.length <= 1}
          />
        ))}
      </div>

      <Button onClick={() => append(createGoal())} type="button" variant="outline">
        Add goal
      </Button>
    </div>
  );
}
