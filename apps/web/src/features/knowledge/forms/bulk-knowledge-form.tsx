import { Alert, AlertDescription, Button, Form } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormSection } from "@/components/form/form-section";
import { TextareaField } from "@/components/form/textarea-field";
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
      patterns: "",
    },
    mode: "onBlur",
    resolver: bulkKnowledgeFormResolver,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const patterns = values.patterns
        .split(/\r?\n/)
        .map((pattern) => pattern.trim())
        .filter(Boolean);
      const result = await onSubmit(patterns);
      await onSuccess?.(result);
      setSuccessMessage(
        `Submission ${result.submissionId} queued ${result.queuedCount} of ${result.totalCount} pattern${
          result.totalCount === 1 ? "" : "s"
        }. Generated items will arrive as pending review.`,
      );
      form.reset({
        patterns: "",
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
          <TextareaField
            control={form.control}
            label="Draft patterns"
            minRows={10}
            name="patterns"
            placeholder={["would rather <v>", "used to <v>", "be supposed to <v>"].join("\n")}
          />

          <div className="flex flex-wrap gap-3">
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
