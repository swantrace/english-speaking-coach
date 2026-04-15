import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@english-coach/ui";
import { type Control, useFieldArray, useWatch } from "react-hook-form";
import { TextareaField } from "@/components/form/textarea-field";
import type { ScenarioFormValues } from "../types";

function createDialogueTurn(characterIndex: 0 | 1 = 0) {
  return {
    characterIndex,
    id: crypto.randomUUID(),
    text: "",
  };
}

interface ExampleDialogueFieldArrayProps {
  control: Control<ScenarioFormValues>;
}

export function ExampleDialogueFieldArray({ control }: ExampleDialogueFieldArrayProps) {
  const characterNames = useWatch({
    control,
    name: "characters",
  });
  const { append, fields, remove } = useFieldArray({
    control,
    keyName: "fieldId",
    name: "exampleDialogue",
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => {
        const turnPath = `exampleDialogue.${index}` as const;
        const firstCharacterLabel = characterNames?.[0]?.name?.trim() || "Character 1";
        const secondCharacterLabel = characterNames?.[1]?.name?.trim() || "Character 2";

        return (
          <div className="space-y-4 rounded-[1.5rem] border border-stone-200 p-5" key={field.fieldId}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg text-slate-950">Turn {index + 1}</h3>
                <p className="text-sm text-slate-600">Example dialogue stays keyed to the two scenario characters.</p>
              </div>

              <Button disabled={fields.length <= 1} onClick={() => remove(index)} type="button" variant="outline">
                Remove turn
              </Button>
            </div>

            <FormField
              control={control}
              name={`${turnPath}.characterIndex`}
              render={({ field: selectField }) => (
                <FormItem>
                  <FormLabel>Speaker</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => selectField.onChange(value === "1" ? 1 : 0)}
                      value={String(selectField.value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose speaker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{firstCharacterLabel}</SelectItem>
                        <SelectItem value="1">{secondCharacterLabel}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <TextareaField
              control={control}
              label="Dialogue text"
              minRows={3}
              name={`${turnPath}.text`}
              placeholder="Welcome to the hotel. How can I help you today?"
            />
          </div>
        );
      })}

      <Button onClick={() => append(createDialogueTurn())} type="button" variant="outline">
        Add dialogue turn
      </Button>
    </div>
  );
}
