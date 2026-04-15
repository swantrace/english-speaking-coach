import { Alert, AlertDescription, Button, Form } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { FormSection } from "@/components/form/form-section";
import { TextField } from "@/components/form/text-field";
import { bulkKnowledgeFormResolver } from "../schemas";
import type { BulkKnowledgeFormValues, BulkKnowledgeSubmissionView } from "../types";

interface BulkKnowledgeFormProps {
  cancelTo: string;
  onSubmit: (patterns: string[]) => Promise<BulkKnowledgeSubmissionView>;
  onSuccess?: (result: BulkKnowledgeSubmissionView) => void | Promise<void>;
}

export function BulkKnowledgeForm({ cancelTo, onSubmit, onSuccess }: BulkKnowledgeFormProps) {
  const form = useForm<BulkKnowledgeFormValues>({
    defaultValues: {
      patterns: [{ value: "" }],
    },
    mode: "onBlur",
    resolver: bulkKnowledgeFormResolver,
  });
  const { append, fields, remove } = useFieldArray({
    control: form.control,
    keyName: "fieldId",
    name: "patterns",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await onSubmit(values.patterns.map((pattern) => pattern.value.trim()).filter(Boolean));
      await onSuccess?.(result);
      setSuccessMessage(
        `Submission ${result.submissionId} queued ${result.queuedCount} of ${result.totalCount} pattern${
          result.totalCount === 1 ? "" : "s"
        }. Generated items will arrive as pending review.`,
      );
      form.reset({
        patterns: [{ value: "" }],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't submit the bulk generation request.");
    }
  });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FormSection
          description="Add one draft knowledge pattern per row. Backend workers will expand these later and place generated items into the admin review queue."
          title="Draft patterns"
        >
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div className="space-y-3 rounded-[1.5rem] border border-stone-200 p-5" key={field.fieldId}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg text-slate-950">Pattern {index + 1}</h3>
                  <Button disabled={fields.length <= 1} onClick={() => remove(index)} type="button" variant="outline">
                    Remove
                  </Button>
                </div>

                <TextField
                  control={form.control}
                  label="Draft pattern"
                  name={`patterns.${index}.value`}
                  placeholder="would rather <v>"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => append({ value: "" })} type="button" variant="outline">
              Add pattern row
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link to={cancelTo}>Back to knowledge</Link>
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
            {form.formState.isSubmitting ? "Submitting..." : "Submit patterns"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
