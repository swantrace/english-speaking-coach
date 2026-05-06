import { Alert, AlertDescription, Button, Form } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
      drafts: "",
    },
    mode: "onBlur",
    resolver: bulkScenarioFormResolver,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const drafts = values.drafts
        .split(/\r?\n/)
        .map((draft) => draft.trim())
        .filter(Boolean);
      const result = await onSubmit(drafts);
      await onSuccess?.(result);
      setSuccessMessage(
        `Submission ${result.submissionId} queued ${result.queuedCount} of ${result.totalCount} draft${
          result.totalCount === 1 ? "" : "s"
        }. Generated scenarios will enter review as pending.`,
      );
      form.reset({
        drafts: "",
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
          <TextareaField
            control={form.control}
            label="Setting descriptions"
            minRows={10}
            name="drafts"
            placeholder={[
              "A student talks to a pharmacist about side effects and asks whether they should keep taking the medicine.",
              "A traveler calls a hotel to change a booking after a delayed flight.",
              "A parent meets a teacher to discuss a child's reading progress.",
            ].join("\n")}
          />

          <div className="flex flex-wrap gap-3">
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
