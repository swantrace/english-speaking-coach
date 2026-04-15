import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@english-coach/ui";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface ImageUploadFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  description?: string;
  label: string;
  name: FieldPath<TFieldValues>;
  placeholder?: string;
}

export function ImageUploadField<TFieldValues extends FieldValues>({
  control,
  description,
  label,
  name,
  placeholder = "https://example.com/scenario-cover.jpg",
}: ImageUploadFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
            <FormControl>
              <div className="space-y-4">
                <Input placeholder={placeholder} type="url" {...field} value={value} />
                {value ? (
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                    <img alt="Scenario preview" className="aspect-[16/9] w-full object-cover" src={value} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-4 text-sm text-slate-500">
                    No image URL added yet. This stays URL-based for now so the upload contract can be swapped in later
                    without changing the form shape.
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
