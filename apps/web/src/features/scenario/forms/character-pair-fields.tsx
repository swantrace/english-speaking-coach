import type { Control } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import type { ScenarioFormValues } from "../types";

interface CharacterPairFieldsProps {
  control: Control<ScenarioFormValues>;
}

export function CharacterPairFields({ control }: CharacterPairFieldsProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-4 rounded-[1.5rem] border border-stone-200 p-5">
        <div className="space-y-1">
          <h3 className="text-lg text-slate-950">Character 1</h3>
          <p className="text-sm text-slate-600">Define the first role in the scenario pair.</p>
        </div>

        <TextField control={control} label="Name" name="characters.0.name" placeholder="Receptionist" />
        <TextareaField
          control={control}
          label="Description"
          minRows={4}
          name="characters.0.description"
          placeholder="Helpful, efficient, and trying to keep the line moving."
        />
      </div>

      <div className="space-y-4 rounded-[1.5rem] border border-stone-200 p-5">
        <div className="space-y-1">
          <h3 className="text-lg text-slate-950">Character 2</h3>
          <p className="text-sm text-slate-600">Define the second role in the scenario pair.</p>
        </div>

        <TextField control={control} label="Name" name="characters.1.name" placeholder="Traveler" />
        <TextareaField
          control={control}
          label="Description"
          minRows={4}
          name="characters.1.description"
          placeholder="Tired after a flight and trying to solve a booking problem."
        />
      </div>
    </div>
  );
}
