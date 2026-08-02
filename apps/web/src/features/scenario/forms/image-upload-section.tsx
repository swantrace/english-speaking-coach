import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@english-coach/ui";
import type { Control } from "react-hook-form";
import { SwitchField } from "@/components/form/switch-field";
import { PrivateMediaImage } from "@/components/media/private-media-image";
import type { ScenarioFormValues } from "../types";

interface ImageUploadSectionProps {
  control: Control<ScenarioFormValues>;
}

export function ImageUploadSection({ control }: ImageUploadSectionProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="imageFile"
        render={({ field: { onBlur, onChange, ref } }) => (
          <FormItem>
            <FormLabel>Private scenario image</FormLabel>
            <p className="text-sm text-slate-500">Upload AVIF, JPEG, PNG, or WebP up to 5 MiB.</p>
            <FormControl>
              <Input
                accept="image/avif,image/jpeg,image/png,image/webp"
                onBlur={onBlur}
                onChange={(event) => onChange(event.target.files?.[0] ?? null)}
                ref={ref}
                type="file"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="imageAssetId"
        render={({ field }) => (
          <div>
            {field.value ? (
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                <PrivateMediaImage
                  alt="Current scenario"
                  assetId={field.value}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        )}
      />

      <SwitchField
        control={control}
        description="Remove the currently stored image when you save. A newly selected file takes precedence."
        label="Remove current image"
        name="removeImage"
      />
    </div>
  );
}
