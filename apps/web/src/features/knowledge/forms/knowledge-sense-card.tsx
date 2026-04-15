import { Button, FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@english-coach/ui";
import type { Control } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import type { KnowledgeFormValues } from "../types";

interface KnowledgeSenseCardProps {
  control: Control<KnowledgeFormValues>;
  index: number;
  isRemovable: boolean;
  onRemove: () => void;
}

export function KnowledgeSenseCard({ control, index, isRemovable, onRemove }: KnowledgeSenseCardProps) {
  return (
    <div className="space-y-4 rounded-[1.5rem] border border-stone-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg text-slate-950">Sense {index + 1}</h3>
        <Button disabled={!isRemovable} onClick={onRemove} type="button" variant="outline">
          Remove
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
        <FormField
          control={control}
          name={`senses.${index}.order`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order</FormLabel>
              <FormControl>
                <Input
                  min={1}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  type="number"
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <TextField control={control} label="Meaning (EN)" name={`senses.${index}.meaningEn`} />
        <TextField control={control} label="Meaning (ZH)" name={`senses.${index}.meaningZh`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TextareaField control={control} label="Example" name={`senses.${index}.example`} />
        <TextareaField control={control} label="Example (ZH)" name={`senses.${index}.exampleZh`} />
      </div>

      <TextareaField
        control={control}
        description="Use this for constraints, register notes, or structural guidance when it helps review."
        label="Grammatical note"
        minRows={3}
        name={`senses.${index}.grammaticalNote`}
        placeholder="Optional"
      />
    </div>
  );
}
