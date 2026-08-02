import { Alert, AlertDescription, Form } from "@english-coach/ui";
import { type ReactNode, useState } from "react";
import { SubmitBar } from "@/components/form/submit-bar";
import { mapScenarioFormValuesToAdminPayload } from "../mappers";
import type { AdminScenarioWritePayload, ScenarioFormValues } from "../types";
import { ScenarioFormFields } from "./scenario-form-fields";
import { useScenarioForm } from "./use-scenario-form";

interface ScenarioFormProps {
  cancelTo: string;
  defaultValues?: ScenarioFormValues;
  deleteAction?: ReactNode;
  mode: "create" | "edit";
  onSubmit: (values: AdminScenarioWritePayload, image: { file: File | null; remove: boolean }) => Promise<void>;
}

export function ScenarioForm({ cancelTo, defaultValues, deleteAction, mode, onSubmit }: ScenarioFormProps) {
  const form = useScenarioForm(defaultValues);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);

    try {
      await onSubmit(mapScenarioFormValuesToAdminPayload(values), {
        file: values.imageFile,
        remove: values.removeImage,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't save this scenario.");
    }
  });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <ScenarioFormFields control={form.control} />

        <SubmitBar
          cancelTo={cancelTo}
          isPending={form.formState.isSubmitting}
          secondaryAction={mode === "edit" ? deleteAction : undefined}
          submitLabel={mode === "create" ? "Create scenario" : "Save changes"}
        />
      </form>
    </Form>
  );
}
