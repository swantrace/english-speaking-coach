import { Alert, AlertDescription, Button, Form } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { FormSection } from "@/components/form/form-section";
import { TextareaField } from "@/components/form/textarea-field";
import { bulkScenarioFormResolver } from "../schemas";
import type { BulkScenarioFormValues, BulkScenarioSubmissionView } from "../types";

interface BulkScenarioFormProps {
  cancelTo: string;
  onSuccess?: (result: BulkScenarioSubmissionView) => void | Promise<void>;
  onSubmit: (drafts: string[]) => Promise<BulkScenarioSubmissionView>;
}

export function BulkScenarioForm({ cancelTo, onSubmit, onSuccess }: BulkScenarioFormProps) {
  const form = useForm<BulkScenarioFormValues>({
    defaultValues: {
      drafts: [{ value: "" }],
    },
    mode: "onBlur",
    resolver: bulkScenarioFormResolver,
  });
  const { append, fields, remove } = useFieldArray({
    control: form.control,
    keyName: "fieldId",
    name: "drafts",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await onSubmit(values.drafts.map((draft) => draft.value.trim()).filter(Boolean));
      await onSuccess?.(result);
      setSuccessMessage(
        `Submission ${result.submissionId} queued ${result.queuedCount} of ${result.totalCount} draft${
          result.totalCount === 1 ? "" : "s"
        }. Generated scenarios will enter review as pending.`,
      );
      form.reset({
        drafts: [{ value: "" }],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't queue the bulk generation request.");
    }
  });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FormSection
          description="Add one draft setting description per row. Backend workers will turn these into scenarios later and mark them pending review."
          title="Bulk generation drafts"
        >
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div className="space-y-3 rounded-[1.5rem] border border-stone-200 p-5" key={field.fieldId}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg text-slate-950">Draft {index + 1}</h3>
                  <Button disabled={fields.length <= 1} onClick={() => remove(index)} type="button" variant="outline">
                    Remove
                  </Button>
                </div>

                <TextareaField
                  control={form.control}
                  label="Setting description"
                  minRows={4}
                  name={`drafts.${index}.value`}
                  placeholder="A student talks to a pharmacist about side effects and asks whether they should keep taking the medicine."
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => append({ value: "" })} type="button" variant="outline">
              Add draft row
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link to={cancelTo}>Back to scenarios</Link>
            </Button>
          </div>
        </FormSection>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? "Submitting..." : "Submit drafts"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
