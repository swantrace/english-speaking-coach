import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  MoreHorizontal,
} from "@english-coach/ui";
import { Fragment, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";

export interface RowActionConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
}

export interface RowActionItem {
  key: string;
  label: string;
  onSelect: () => void | Promise<void>;
  confirmation?: RowActionConfirmation;
  isDestructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  separatorBefore?: boolean;
}

interface RowActionsDropdownProps {
  actions: RowActionItem[];
  triggerLabel?: string;
}

export function RowActionsDropdown({ actions, triggerLabel = "Open actions" }: RowActionsDropdownProps) {
  const [selectedAction, setSelectedAction] = useState<RowActionItem | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const visibleActions = useMemo(() => actions.filter((action) => !action.hidden), [actions]);

  if (visibleActions.length === 0) {
    return <span className="text-sm text-slate-400">No actions</span>;
  }

  async function executeAction(action: RowActionItem) {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await action.onSelect();
      setSelectedAction(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't complete that action.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 rounded-lg border border-transparent shadow-none hover:border-stone-200 hover:bg-stone-100"
            disabled={isPending}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal className="size-4 text-slate-600" />
            <span className="sr-only">{triggerLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl border-stone-200 shadow-lg">
          {visibleActions.map((action, index) => (
            <Fragment key={action.key}>
              {action.separatorBefore && index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={action.disabled || isPending}
                onSelect={(event) => {
                  event.preventDefault();
                  setErrorMessage(null);

                  if (action.confirmation) {
                    setSelectedAction(action);
                    return;
                  }

                  void executeAction(action);
                }}
                variant={action.isDestructive ? "destructive" : "default"}
              >
                {action.label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedAction?.confirmation ? (
        <ConfirmDialog
          cancelLabel={selectedAction.confirmation.cancelLabel}
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
