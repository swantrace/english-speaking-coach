import { Settings2 } from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";

function DataTableViewOptions<TData>({ table, disabled }: { table: Table<TData>; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="ml-auto h-9 rounded-xl px-3 shadow-none" disabled={disabled} size="sm" variant="outline">
          <Settings2 className="size-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/70 shadow-lg">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
          .map((column) => {
            const header = column.columnDef.header;
            const label = typeof header === "string" ? header : column.id;

            return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              className="capitalize"
              disabled={disabled}
              onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
            >
              {label}
            </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DataTableViewOptions };
