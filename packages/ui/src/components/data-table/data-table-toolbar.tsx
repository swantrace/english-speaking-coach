import type { ColumnFiltersState, Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

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
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Input } from "../input";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import type { BulkAction, DataTableFacetedFilterConfig } from "./types";
import { DataTableViewOptions } from "./data-table-view-options";

function DataTableToolbar<TData>({
  table,
  facetedFilters,
  bulkActions,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder = "Filter...",
  onResetColumnFilters,
}: {
  table: Table<TData>;
  facetedFilters?: DataTableFacetedFilterConfig[];
  bulkActions?: BulkAction<TData>[];
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  searchPlaceholder?: string;
  onResetColumnFilters?: (nextFilters: ColumnFiltersState) => void;
}) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BulkAction<TData>>();
  const [localFilter, setLocalFilter] = useState(globalFilter);

  useEffect(() => {
    setLocalFilter(globalFilter);
  }, [globalFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onGlobalFilterChange(localFilter);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [localFilter, onGlobalFilterChange]);

  const handleActionClick = (action: BulkAction<TData>) => {
    setSelectedAction(action);

    if (action.confirmation) {
      setIsConfirming(true);
      return;
    }

    void (async () => {
      await action.action(selectedRows.map((row) => row.original));
      table.resetRowSelection();
    })();
  };

  const handleConfirm = async () => {
    if (!selectedAction) {
      return;
    }

    await selectedAction.action(selectedRows.map((row) => row.original));
    setIsConfirming(false);
    table.resetRowSelection();
  };

  const resetFilters = () => {
    table.resetColumnFilters();
    onResetColumnFilters?.([]);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-1 items-center space-x-2">
        <Input className="h-8 w-[150px] lg:w-[250px]" onChange={(event) => setLocalFilter(event.target.value)} placeholder={searchPlaceholder} value={localFilter} />
        {facetedFilters?.map((filter) => {
          const column = table.getColumn(filter.columnId);

          if (!column) {
            return null;
          }

          return <DataTableFacetedFilter key={filter.columnId} column={column} options={filter.options} title={filter.title} />;
        })}
        {isFiltered ? (
          <Button className="h-8 px-2 lg:px-3" onClick={resetFilters} variant="ghost">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="flex items-center space-x-2">
        {selectedRows.length > 0 && bulkActions?.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {selectedRows.length} selected <X className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {bulkActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  className={action.isDestructive ? "text-destructive" : undefined}
                  onClick={() => handleActionClick(action)}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <DataTableViewOptions table={table} />
      </div>

      {selectedAction?.confirmation ? (
        <AlertDialog onOpenChange={setIsConfirming} open={isConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedAction.confirmation.title}</AlertDialogTitle>
              <AlertDialogDescription>{selectedAction.confirmation.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{selectedAction.confirmation.cancelText ?? "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                className={selectedAction.isDestructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
                onClick={() => void handleConfirm()}
              >
                {selectedAction.confirmation.confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

export { DataTableToolbar };