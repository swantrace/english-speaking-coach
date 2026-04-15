import type { Control } from "react-hook-form";
import { FormSection } from "@/components/form/form-section";
import { SwitchField } from "@/components/form/switch-field";
import { TagInputField } from "@/components/form/tag-input-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import type { ScenarioFormValues } from "../types";
import { CharacterPairFields } from "./character-pair-fields";
import { ExampleDialogueFieldArray } from "./example-dialogue-field-array";
import { ImageUploadSection } from "./image-upload-section";
import { ScenarioGoalsFieldArray } from "./scenario-goals-field-array";

interface ScenarioFormFieldsProps {
  control: Control<ScenarioFormValues>;
}

export function ScenarioFormFields({ control }: ScenarioFormFieldsProps) {
  return (
    <>
      <FormSection
        description="Capture the learner-facing scenario summary, review state, and browseable metadata."
        title="Scenario basics"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField control={control} label="Scenario title" name="title" placeholder="Requesting a room change" />
          <SwitchField
            control={control}
            description="Pending-review scenarios stay out of the learner catalog until approved."
            label="Keep pending review"
            name="isPendingReview"
          />
        </div>

        <TextareaField
          control={control}
          label="Setting description"
          minRows={5}
          name="setting"
          placeholder="A hotel guest arrives late at night and asks the front desk to move them away from a noisy elevator."
        />

        <TagInputField
          control={control}
          description="Use lightweight tags for table filters and browsing."
          label="Tags"
          name="tags"
          placeholder="Add tag"
        />
      </FormSection>

      <FormSection
        description="Scenarios always have exactly two characters so the runtime can map turns and roles cleanly."
        title="Characters"
      >
        <CharacterPairFields control={control} />
      </FormSection>

      <FormSection
        description="Define the goal inventory and the intent or slot requirements behind each goal."
        title="Goals"
      >
        <ScenarioGoalsFieldArray control={control} />
      </FormSection>

      <FormSection
        description="Seed the detail page with a short example exchange between the two scenario characters."
        title="Example dialogue"
      >
        <ExampleDialogueFieldArray control={control} />
      </FormSection>

      <FormSection
        description="Image support remains intentionally isolated at the form edge so storage wiring can change later."
        title="Cover image"
      >
        <ImageUploadSection control={control} />
      </FormSection>
    </>
  );
}
