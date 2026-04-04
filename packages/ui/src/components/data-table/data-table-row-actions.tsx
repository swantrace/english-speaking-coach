import { MoreHorizontal } from "lucide-react";
import { Fragment, useState } from "react";

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
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import type { RowAction } from "./types";

function DataTableRowActions<TData>({ actions, rowData }: { actions: RowAction<TData>[]; rowData: TData }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedAction, setSelectedAction] = useState<RowAction<TData>>();

  if (actions.length === 0) {
    return null;
  }

  const handleActionSelect = (action: RowAction<TData>) => {
    setSelectedAction(action);

    if (action.confirmation) {
      setIsConfirming(true);
      return;
    }

    void action.action(rowData);
  };

  const handleConfirm = async () => {
    if (!selectedAction) {
      return;
    }

    await selectedAction.action(rowData);
    setIsConfirming(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="size-8 data-[state=open]:bg-muted" size="icon" variant="ghost">
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {actions.map((action, index) => (
            <Fragment key={action.label}>
              <DropdownMenuItem
                onSelect={() => handleActionSelect(action)}
                variant={action.isDestructive ? "destructive" : "default"}
              >
                {action.label}
              </DropdownMenuItem>
              {index < actions.length - 1 ? <DropdownMenuSeparator /> : null}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedAction?.confirmation ? (
        <AlertDialog onOpenChange={setIsConfirming} open={isConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedAction.confirmation.title}</AlertDialogTitle>
              <AlertDialogDescription>{selectedAction.confirmation.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{selectedAction.confirmation.cancelText ?? "Cancel"}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleConfirm()}>
                {selectedAction.confirmation.confirmText ?? "Continue"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}

export { DataTableRowActions };