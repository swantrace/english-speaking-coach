import { Alert, AlertDescription, Button } from "@english-coach/ui";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";

interface BulkActionConfirmation {
  confirmLabel: string;
  description: string;
  title: string;
}

export interface DataTableBulkAction {
  confirmation?: BulkActionConfirmation;
  disabled?: boolean;
  isDestructive?: boolean;
  key: string;
  label: string;
  onSelect: () => void | Promise<void>;
}

interface DataTableBulkBarProps {
  actions: DataTableBulkAction[];
  onClearSelection?: () => void;
  selectedCount: number;
}

export function DataTableBulkBar({ actions, onClearSelection, selectedCount }: DataTableBulkBarProps) {
  const [selectedAction, setSelectedAction] = useState<DataTableBulkAction | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const visibleActions = useMemo(() => actions.filter((action) => !action.disabled), [actions]);

  if (selectedCount <= 0 || visibleActions.length === 0) {
    return null;
  }

  async function executeAction(action: DataTableBulkAction) {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await action.onSelect();
      setSelectedAction(null);
      onClearSelection?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't complete that bulk action.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-700">
            {selectedCount.toLocaleString()} scenario{selectedCount === 1 ? "" : "s"} selected
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {visibleActions.map((action) => (
              <Button
                key={action.key}
                onClick={() => {
                  setErrorMessage(null);

                  if (action.confirmation) {
                    setSelectedAction(action);
                    return;
                  }

                  void executeAction(action);
                }}
                size="sm"
                type="button"
                variant={action.isDestructive ? "destructive" : "outline"}
              >
                {action.label}
              </Button>
            ))}

            {onClearSelection ? (
              <Button disabled={isPending} onClick={onClearSelection} size="sm" type="button" variant="ghost">
                Clear selection
              </Button>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <Alert className="mt-3 border-red-200 bg-red-50 text-red-800" variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {selectedAction?.confirmation ? (
        <ConfirmDialog
          confirmLabel={selectedAction.confirmation.confirmLabel}
          description={selectedAction.confirmation.description}
          errorMessage={errorMessage}
          isPending={isPending}
          onConfirm={() => executeAction(selectedAction)}
          onOpenChange={(open) => {
            if (!open && !isPending) {
              setSelectedAction(null);
              setErrorMessage(null);
            }
          }}
          open={Boolean(selectedAction)}
          title={selectedAction.confirmation.title}
        />
      ) : null}
    </>
  );
}
