import type { Column } from "@tanstack/react-table";
import { Check, PlusCircle } from "lucide-react";

import { Badge } from "../badge";
import { Button } from "../button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../command";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Separator } from "../separator";
import { cn } from "../../lib/utils";
import type { DataTableFacetedFilterOption } from "./types";

type DataTableFacetedFilterProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title?: string;
  options?: Record<string, DataTableFacetedFilterOption>;
};

function DataTableFacetedFilter<TData, TValue>({ column, title, options }: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column.getFacetedUniqueValues();
  const selectedValues = new Set<string>((column.getFilterValue() as string[] | undefined) ?? []);
  const header = column.columnDef.header;
  const filterTitle = title ?? (typeof header === "string" ? header : column.id);

  const filterOptions = options
    ? Object.entries(options).map(([value, option]) => ({
        icon: option.icon,
        label: option.label,
        value,
      }))
    : Array.from(facets.keys()).map((value: string) => ({
        icon: undefined,
        label: value,
        value,
      }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="h-9 rounded-xl border-transparent bg-transparent px-3 text-foreground shadow-none hover:border-border/70 hover:bg-accent"
          size="sm"
          variant="outline"
        >
          <PlusCircle className="size-4" />
          {filterTitle}
          {selectedValues.size > 0 ? (
            <>
              <Separator className="mx-2 h-4" orientation="vertical" />
              <Badge className="rounded-sm px-1 font-normal lg:hidden" variant="secondary">
                {selectedValues.size}
              </Badge>
              <div className="hidden gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge className="rounded-sm px-1 font-normal" variant="secondary">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  filterOptions
                    .filter((option: { value: string; label: string }) => selectedValues.has(option.value))
                    .map((option: { value: string; label: string }) => (
                      <Badge key={option.value} className="rounded-sm px-1 font-normal" variant="secondary">
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[240px] rounded-xl border-border/70 p-0 shadow-lg">
        <Command>
          <CommandInput placeholder={`Search ${String(filterTitle).toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filterOptions.map((option: { value: string; label: string; icon?: DataTableFacetedFilterOption["icon"] }) => {
                const isSelected = selectedValues.has(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }

                      const filterValues = Array.from(selectedValues);
                      column.setFilterValue(filterValues.length > 0 ? filterValues : undefined);
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="size-4" />
                    </div>
                    {option.icon ? <option.icon className="mr-2 size-4 text-muted-foreground" /> : null}
                    <span>{option.label}</span>
                    {facets.get(option.value) ? (
                      <span className="ml-auto flex size-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem className="justify-center text-center" onSelect={() => column.setFilterValue(undefined)}>
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { DataTableFacetedFilter };
