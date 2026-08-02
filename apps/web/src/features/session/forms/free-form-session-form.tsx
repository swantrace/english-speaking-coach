import { Alert, AlertDescription, Button, Form } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { PageSection } from "@/components/app/page-section";
import { RichTextField } from "@/components/form/rich-text-field";
import { useCreateFreeFormSessionMutation } from "../mutations";
import type { SessionStartResult } from "../types";
import { useFreeFormSessionForm } from "./use-free-form-session-form";

interface FreeFormSessionFormProps {
  onSuccess?: (result: SessionStartResult) => void | Promise<void>;
}

export function FreeFormSessionForm({ onSuccess }: FreeFormSessionFormProps) {
  const form = useFreeFormSessionForm();
  const createSessionMutation = useCreateFreeFormSessionMutation({ onSuccess });

  const handleSubmit = form.handleSubmit(async (values) => {
    createSessionMutation.reset();
    await createSessionMutation.mutateAsync(values);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_20rem]">
      <PageSection className="rounded-[0.25rem] border border-stone-200 bg-white p-6 shadow-sm" title="Session context">
        <Form {...form}>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {createSessionMutation.error ? (
              <Alert variant="destructive">
                <AlertDescription>{createSessionMutation.error.message}</AlertDescription>
              </Alert>
            ) : null}

            <RichTextField
              control={form.control}
              description="Paste an article, write a vocabulary bank, or sketch a topic. Use the visual editor or paste Markdown directly—the saved context stays in Markdown format."
              disabled={createSessionMutation.isPending}
              label="Practice context"
              name="content"
              placeholder="Add the material you want this session to focus on. You can paste notes, create lists, or write a short brief."
            />

            <div className="flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-600">
                Starting a free-form session will create the session record now and hand off to the live route next.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild disabled={createSessionMutation.isPending} type="button" variant="outline">
                  <Link to="/app">Cancel</Link>
                </Button>
                <Button disabled={createSessionMutation.isPending} type="submit">
                  {createSessionMutation.isPending ? "Starting session..." : "Start free-form session"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </PageSection>

      <PageSection
        className="rounded-[0.25rem] border border-stone-200 bg-stone-50 p-6 shadow-sm"
        description="Keep this lightweight. The goal here is to bridge setup into a live session, not to front-load configuration."
        title="Good inputs for this mode"
      >
        <ul className="space-y-3 text-sm leading-6 text-slate-600">
          <li>Article excerpts you want to discuss aloud</li>
          <li>Vocabulary lists you want to practice naturally</li>
          <li>Short topic briefs for open-ended speaking</li>
          <li>Notes from a prior role-play you want to review</li>
        </ul>
      </PageSection>
    </div>
  );
}
