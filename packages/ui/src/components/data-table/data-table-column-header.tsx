import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import type * as React from "react";

import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { cn } from "../../lib/utils";

type DataTableColumnHeaderProps<TData, TValue> = React.HTMLAttributes<HTMLDivElement> & {
  column: Column<TData, TValue>;
  title: string;
};

function DataTableColumnHeader<TData, TValue>({ column, title, className }: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn("text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground", className)}>{title}</div>;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="-ml-3 h-8 rounded-lg px-3 data-[state=open]:bg-accent" size="sm" variant="ghost">
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="size-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="size-4" />
            ) : (
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-xl border-border/70 shadow-lg">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
          {column.getCanHide() ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground/70" />
                Hide
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export { DataTableColumnHeader };
