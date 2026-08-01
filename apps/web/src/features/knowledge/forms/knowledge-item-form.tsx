import { Alert, AlertDescription, Form } from "@english-coach/ui";
import type { ReactNode } from "react";
import { useState } from "react";
import { SubmitBar } from "@/components/form/submit-bar";
import { mapKnowledgeFormValuesToAdminPayload } from "../mappers";
import type { AdminKnowledgeWritePayload, KnowledgeFormValues } from "../types";
import { KnowledgeFormFields } from "./knowledge-form-fields";
import { useKnowledgeForm } from "./use-knowledge-form";

interface KnowledgeItemFormProps {
  cancelTo: string;
  defaultValues?: KnowledgeFormValues;
  deleteAction?: ReactNode;
  mode: "create" | "edit";
  onSubmit: (values: AdminKnowledgeWritePayload) => Promise<void>;
  submitLabel?: string;
}

export function KnowledgeItemForm({
  cancelTo,
  defaultValues,
  deleteAction,
  mode,
  onSubmit,
  submitLabel,
}: KnowledgeItemFormProps) {
  const form = useKnowledgeForm(defaultValues);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);

    try {
      await onSubmit(mapKnowledgeFormValuesToAdminPayload(values));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't save this knowledge item.");
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

        <KnowledgeFormFields control={form.control} />

        <SubmitBar
          cancelTo={cancelTo}
          isPending={form.formState.isSubmitting}
          secondaryAction={mode === "edit" ? deleteAction : undefined}
          submitLabel={submitLabel ?? (mode === "create" ? "Create knowledge item" : "Save changes")}
        />
      </form>
    </Form>
  );
}
