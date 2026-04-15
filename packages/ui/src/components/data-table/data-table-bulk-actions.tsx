import type { Table } from "@tanstack/react-table";
import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Separator } from "../separator";
import { cn } from "../../lib/utils";
import type { BulkAction } from "./types";

function DataTableBulkActions<TData>({
  actions,
  selectionLabel = "item",
  table,
}: {
  actions: BulkAction<TData>[];
  selectionLabel?: string;
  table: Table<TData>;
}) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const [selectedAction, setSelectedAction] = useState<BulkAction<TData> | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (selectedCount <= 0 || actions.length === 0) {
    return null;
  }

  async function executeAction(action: BulkAction<TData>) {
    setIsPending(true);

    try {
      await action.action(selectedRows.map((row) => row.original));
      table.resetRowSelection();
      setSelectedAction(null);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        <div
          className={cn(
            "pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-border/70 bg-background/95 px-3 py-2 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80",
          )}
          role="toolbar"
          aria-label={`Bulk actions for ${selectedCount} selected ${selectionLabel}${selectedCount === 1 ? "" : "s"}`}
        >
          <Button
            aria-label="Clear selection"
            className="size-8 rounded-full shadow-none"
            disabled={isPending}
            onClick={() => table.resetRowSelection()}
            size="icon"
            type="button"
            variant="outline"
          >
            <X className="size-4" />
          </Button>
          <Separator className="h-6" orientation="vertical" />
          <div className="flex items-center gap-2 pr-1 text-sm text-muted-foreground">
            <Badge className="min-w-8 justify-center rounded-md px-2" variant="secondary">
              {selectedCount}
            </Badge>
            <span>
              {selectionLabel}
              {selectedCount === 1 ? "" : "s"} selected
            </span>
          </div>
          <Separator className="hidden h-6 sm:block" orientation="vertical" />
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                className="rounded-lg shadow-none"
                disabled={action.disabled || isPending}
                onClick={() => {
                  if (action.confirmation) {
                    setSelectedAction(action);
                    return;
                  }

                  void executeAction(action);
                }}
                size="sm"
                type="button"
                variant={action.isDestructive ? "destructive" : "default"}
              >
                {isPending && selectedAction?.label === action.label ? <LoaderCircle className="animate-spin" /> : null}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {selectedAction?.confirmation ? (
        <AlertDialog onOpenChange={(open) => !open && !isPending && setSelectedAction(null)} open={Boolean(selectedAction)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedAction.confirmation.title}</AlertDialogTitle>
              <AlertDialogDescription>{selectedAction.confirmation.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{selectedAction.confirmation.cancelText ?? "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                className={selectedAction.isDestructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
                disabled={isPending}
                onClick={(event) => {
                  event.preventDefault();
                  void executeAction(selectedAction);
                }}
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                {selectedAction.confirmation.confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}

export { DataTableBulkActions };
