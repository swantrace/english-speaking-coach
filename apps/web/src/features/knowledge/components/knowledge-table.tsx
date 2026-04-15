import {
  type CommunicativeFunction,
  communicativeFunctionValues,
  type FixednessLevel,
  fixednessLevelValues,
  type SyntaxRole,
  syntaxRoleValues,
} from "@english-coach/domain";
import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { formatCommunicativeFunction, formatFixednessLevel, formatSyntaxRole } from "@/lib/format";
import type { KnowledgeListItemView } from "../types";
import { createKnowledgeColumns } from "./knowledge-columns";

interface KnowledgeTableProps {
  communicativeFunction?: CommunicativeFunction;
  fixednessLevel?: FixednessLevel;
  items: KnowledgeListItemView[];
  searchValue: string;
  syntaxRole?: SyntaxRole;
  onCommunicativeFunctionChange: (value?: CommunicativeFunction) => void;
  onFixednessLevelChange: (value?: FixednessLevel) => void;
  onRowClick: (item: KnowledgeListItemView) => void;
  onSearchChange: (value: string) => void;
  onSyntaxRoleChange: (value?: SyntaxRole) => void;
}

export function KnowledgeTable({
  communicativeFunction,
  fixednessLevel,
  items,
  searchValue,
  syntaxRole,
  onCommunicativeFunctionChange,
  onFixednessLevelChange,
  onRowClick,
  onSearchChange,
  onSyntaxRoleChange,
}: KnowledgeTableProps) {
  const columnFilters = useMemo(
    () =>
      buildColumnFilters([
        { id: "syntaxRole", value: syntaxRole },
        { id: "fixednessLevel", value: fixednessLevel },
        { id: "communicativeFunction", value: communicativeFunction },
      ]),
    [communicativeFunction, fixednessLevel, syntaxRole],
  );

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onSyntaxRoleChange(getSingleSelectFilterValue<SyntaxRole>(nextFilters, "syntaxRole"));
    onFixednessLevelChange(getSingleSelectFilterValue<FixednessLevel>(nextFilters, "fixednessLevel"));
    onCommunicativeFunctionChange(
      getSingleSelectFilterValue<CommunicativeFunction>(nextFilters, "communicativeFunction"),
    );
  }

  return (
    <DataTable
      columnFilters={columnFilters}
      columns={createKnowledgeColumns()}
      data={items}
      emptyState={
        <DataTableEmpty
          description="Try a broader search or clear one of the category filters. Only learner-visible knowledge items are shown here."
          title="No knowledge items match these filters"
        />
      }
      facetedFilters={[
        {
          columnId: "syntaxRole",
          options: Object.fromEntries(syntaxRoleValues.map((value) => [value, { label: formatSyntaxRole(value) }])),
          title: "Syntax role",
        },
        {
          columnId: "fixednessLevel",
          options: Object.fromEntries(
            fixednessLevelValues.map((value) => [value, { label: formatFixednessLevel(value) }]),
          ),
          title: "Fixedness",
        },
        {
          columnId: "communicativeFunction",
          options: Object.fromEntries(
            communicativeFunctionValues.map((value) => [value, { label: formatCommunicativeFunction(value) }]),
          ),
          title: "Function",
        },
      ]}
      getRowAriaLabel={(row) => `Open ${row.pattern}`}
      getRowClassName={() => "cursor-pointer transition-colors hover:bg-stone-50"}
      globalFilter={searchValue}
      onColumnFiltersChange={handleColumnFiltersChange}
      onGlobalFilterChange={onSearchChange}
      onRowClick={onRowClick}
      searchPlaceholder="Search knowledge patterns"
    />
  );
}
