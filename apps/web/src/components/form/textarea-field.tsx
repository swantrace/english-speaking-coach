import { FormControl, FormField, FormItem, FormLabel, FormMessage, Textarea } from "@english-coach/ui";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface TextareaFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  description?: string;
  label: string;
  minRows?: number;
  name: FieldPath<TFieldValues>;
  placeholder?: string;
}

export function TextareaField<TFieldValues extends FieldValues>({
  control,
  description,
  label,
  minRows = 4,
  name,
  placeholder,
}: TextareaFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
          <FormControl>
            <Textarea placeholder={placeholder} rows={minRows} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
