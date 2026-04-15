import { Checkbox, FormField, FormItem, FormLabel, FormMessage } from "@english-coach/ui";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface SwitchFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  description?: string;
  label: string;
  name: FieldPath<TFieldValues>;
}

export function SwitchField<TFieldValues extends FieldValues>({
  control,
  description,
  label,
  name,
}: SwitchFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
          <Checkbox checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
          <div className="space-y-1">
            <FormLabel className="text-sm font-medium text-slate-950">{label}</FormLabel>
            {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
