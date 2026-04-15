import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@english-coach/ui";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ReviewStatusBadge } from "@/components/status/review-status-badge";
import { useAdminKnowledgeListQuery } from "@/features/knowledge/queries";
import { formatCommunicativeFunction, formatFixednessLevel, formatSyntaxRole } from "@/lib/format";

interface LinkExistingDialogProps {
  isPending?: boolean;
  onConfirm: (knowledgeItemId: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pattern: string;
}

export function LinkExistingDialog({
  isPending = false,
  onConfirm,
  onOpenChange,
  open,
  pattern,
}: LinkExistingDialogProps) {
  const [searchValue, setSearchValue] = useState(pattern);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string>("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const knowledgeQuery = useAdminKnowledgeListQuery({
    search: deferredSearchValue.trim() || undefined,
  });

  useEffect(() => {
    if (open) {
      setSearchValue(pattern);
      setSelectedKnowledgeId("");
    }
  }, [open, pattern]);

  const selectedItem = useMemo(
    () => knowledgeQuery.data?.items.find((item) => item.id === selectedKnowledgeId) ?? null,
    [knowledgeQuery.data?.items, selectedKnowledgeId],
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link to existing knowledge item</DialogTitle>
          <DialogDescription>
            Search the admin knowledge inventory, choose the best match, and approve this occurrence into that item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Command className="rounded-2xl border border-stone-200">
            <CommandInput
              onValueChange={setSearchValue}
              placeholder="Search by knowledge pattern"
              value={searchValue}
            />
            <CommandList className="max-h-80">
              <CommandEmpty>
                {knowledgeQuery.isPending ? "Loading knowledge items..." : "No knowledge items match this search."}
              </CommandEmpty>
              <CommandGroup heading="Knowledge items">
                {knowledgeQuery.data?.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => setSelectedKnowledgeId(item.id)}
                    value={`${item.pattern} ${item.syntaxRole ?? ""} ${item.communicativeFunction ?? ""}`}
                  >
                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-950">{item.pattern}</p>
                        <p className="text-sm text-slate-600">
                          {item.syntaxRole ? formatSyntaxRole(item.syntaxRole) : "No syntax role"}
                          {" • "}
                          {item.fixednessLevel ? formatFixednessLevel(item.fixednessLevel) : "No fixedness level"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {item.communicativeFunction
                            ? formatCommunicativeFunction(item.communicativeFunction)
                            : "No communicative function"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <ReviewStatusBadge isPendingReview={item.isPendingReview} />
                        {selectedKnowledgeId === item.id ? (
                          <span className="text-sm text-slate-700">Selected</span>
                        ) : null}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>

          {selectedItem ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3 text-sm text-slate-700">
              Selected item: <span className="font-medium text-slate-950">{selectedItem.pattern}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!selectedKnowledgeId || isPending}
            onClick={() => void onConfirm(selectedKnowledgeId)}
            type="button"
          >
            {isPending ? "Linking..." : "Link occurrence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
