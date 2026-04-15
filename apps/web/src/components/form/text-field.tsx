import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@english-coach/ui";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface TextFieldProps<TFieldValues extends FieldValues> {
  autoComplete?: string;
  control: Control<TFieldValues>;
  description?: string;
  label: string;
  name: FieldPath<TFieldValues>;
  placeholder?: string;
  type?: string;
}

export function TextField<TFieldValues extends FieldValues>({
  autoComplete,
  control,
  description,
  label,
  name,
  placeholder,
  type = "text",
}: TextFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
          <FormControl>
            <Input autoComplete={autoComplete} placeholder={placeholder} type={type} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
