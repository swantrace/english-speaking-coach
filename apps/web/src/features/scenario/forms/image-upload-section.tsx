import type { Control } from "react-hook-form";
import { ImageUploadField } from "@/components/form/image-upload-field";
import type { ScenarioFormValues } from "../types";

interface ImageUploadSectionProps {
  control: Control<ScenarioFormValues>;
}

export function ImageUploadSection({ control }: ImageUploadSectionProps) {
  return (
    <ImageUploadField
      control={control}
      description="This stays URL-based for now so storage integration can be swapped in later without changing the admin form contract."
      label="Image URL"
      name="imageUrl"
    />
  );
}
