import type { KnowledgeItem } from "@english-coach/contract";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@english-coach/ui";
import type { KnowledgeItemFormDraft } from "./admin-knowledge-types";

export function KnowledgeItemFormDialog({
  draft,
  error,
  isPending,
  mode,
  onDraftChange,
  onOpenChange,
  onSubmit,
  open,
}: {
  draft: KnowledgeItemFormDraft;
  error?: string;
  isPending: boolean;
  mode: "create" | "edit";
  onDraftChange: (draft: KnowledgeItemFormDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create knowledge item" : "Edit knowledge item"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Review metadata is temporarily disabled here while the knowledge-item schema is being simplified.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2 text-sm text-slate-200">
            <span>Pattern</span>
            <Textarea
              className="min-h-24 border-white/10 bg-slate-900 text-slate-50"
              onChange={(event) => onDraftChange({ ...draft, pattern: event.target.value })}
              value={draft.pattern}
            />
          </div>
          {/* Example text is temporarily disabled while the knowledge-item schema is simplified. */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Syntax role</span>
              <Select
                onValueChange={(value: string) =>
                  onDraftChange({ ...draft, syntaxRole: value ? (value as KnowledgeItem["syntaxRole"]) : null })
                }
                value={draft.syntaxRole ?? "unset"}
              >
                <SelectTrigger className="border-white/10 bg-slate-900 text-slate-50">
                  <SelectValue placeholder="Choose syntax role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Unset</SelectItem>
                  <SelectItem value="predicate_verb">Predicate verb</SelectItem>
                  <SelectItem value="predicate_adjective">Predicate adjective</SelectItem>
                  <SelectItem value="adverbial_modifier">Adverbial modifier</SelectItem>
                  <SelectItem value="noun_phrase">Noun phrase</SelectItem>
                  <SelectItem value="discourse_linker">Discourse linker</SelectItem>
                  <SelectItem value="clause_pattern">Clause pattern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Fixedness</span>
              <Select
                onValueChange={(value: string) =>
                  onDraftChange({ ...draft, fixednessLevel: value ? (value as KnowledgeItem["fixednessLevel"]) : null })
                }
                value={draft.fixednessLevel ?? "unset"}
              >
                <SelectTrigger className="border-white/10 bg-slate-900 text-slate-50">
                  <SelectValue placeholder="Choose fixedness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Unset</SelectItem>
                  <SelectItem value="restricted_collocation">Restricted collocation</SelectItem>
                  <SelectItem value="fixed_expression">Fixed expression</SelectItem>
                  <SelectItem value="idiom">Idiom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Function</span>
              <Select
                onValueChange={(value: string) =>
                  onDraftChange({
                    ...draft,
                    communicativeFunction: value ? (value as KnowledgeItem["communicativeFunction"]) : null,
                  })
                }
                value={draft.communicativeFunction ?? "unset"}
              >
                <SelectTrigger className="border-white/10 bg-slate-900 text-slate-50">
                  <SelectValue placeholder="Choose function" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Unset</SelectItem>
                  <SelectItem value="manage_social_relation">Manage social relation</SelectItem>
                  <SelectItem value="express_attitude_or_opinion">Express attitude or opinion</SelectItem>
                  <SelectItem value="make_request_or_offer">Make request or offer</SelectItem>
                  <SelectItem value="give_or_seek_information">Give or seek information</SelectItem>
                  <SelectItem value="organize_discourse">Organize discourse</SelectItem>
                  <SelectItem value="react_in_conversation">React in conversation</SelectItem>
                  <SelectItem value="express_degree_or_soften">Express degree or soften</SelectItem>
                  <SelectItem value="express_time_or_sequence">Express time or sequence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Review status controls are disabled until the simplified knowledge-item review model lands. */}
          </div>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onSubmit}>
            {isPending ? "Saving..." : mode === "create" ? "Create knowledge item" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
