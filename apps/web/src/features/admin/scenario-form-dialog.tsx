import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from "@english-coach/ui";
import type { ScenarioFormDraft } from "./admin-scenario-types";

export function ScenarioFormDialog({
  draft,
  error,
  isPending,
  mode,
  onDraftChange,
  onOpenChange,
  onSubmit,
  open,
}: {
  draft: ScenarioFormDraft;
  error?: string;
  isPending: boolean;
  mode: "create" | "edit";
  onDraftChange: (draft: ScenarioFormDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl border-white/10 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create scenario" : "Edit scenario"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Scenario definitions stay structured. Characters, goals, and example dialogue use JSON so admin edits remain
            lossless.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Title</span>
            <Input
              className="border-white/10 bg-slate-900 text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
              value={draft.title}
            />
          </div>
          {/* Review status control is temporarily disabled while scenarios use isPendingReview only. */}
          <div className="grid gap-2 text-sm text-slate-200 md:col-span-2">
            <span>Setting</span>
            <Textarea
              className="min-h-24 border-white/10 bg-slate-900 text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, setting: event.target.value })}
              value={draft.setting}
            />
          </div>
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Characters JSON</span>
            <Textarea
              className="min-h-56 border-white/10 bg-slate-900 font-mono text-xs text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, charactersJson: event.target.value })}
              value={draft.charactersJson}
            />
          </div>
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Goals JSON</span>
            <Textarea
              className="min-h-56 border-white/10 bg-slate-900 font-mono text-xs text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, goalsJson: event.target.value })}
              value={draft.goalsJson}
            />
          </div>
          <div className="grid gap-2 text-sm text-slate-200 md:col-span-2">
            <span>Example dialogue JSON</span>
            <Textarea
              className="min-h-52 border-white/10 bg-slate-900 font-mono text-xs text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, exampleDialogueJson: event.target.value })}
              value={draft.exampleDialogueJson}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onSubmit}>
            {isPending ? "Saving..." : mode === "create" ? "Create scenario" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
