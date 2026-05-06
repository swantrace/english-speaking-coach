import {
  type CommunicativeFunction,
  communicativeFunctionValues,
  type FixednessLevel,
  fixednessLevelValues,
  type PatternType,
  patternTypeValues,
} from "@english-coach/domain";
import { DataTable } from "@english-coach/ui";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useMemo } from "react";
import { buildColumnFilters, getSingleSelectFilterValue } from "@/components/data-table/column-filter-state";
import { DataTableEmpty } from "@/components/data-table/data-table-empty";
import { formatCommunicativeFunction, formatFixednessLevel, formatPatternType } from "@/lib/format";
import type { KnowledgeListItemView } from "../types";
import { createKnowledgeColumns } from "./knowledge-columns";

interface KnowledgeTableProps {
  communicativeFunction?: CommunicativeFunction;
  fixednessLevel?: FixednessLevel;
  items: KnowledgeListItemView[];
  searchValue: string;
  patternType?: PatternType;
  onCommunicativeFunctionChange: (value?: CommunicativeFunction) => void;
  onFixednessLevelChange: (value?: FixednessLevel) => void;
  onRowClick: (item: KnowledgeListItemView) => void;
  onSearchChange: (value: string) => void;
  onPatternTypeChange: (value?: PatternType) => void;
}

export function KnowledgeTable({
  communicativeFunction,
  fixednessLevel,
  items,
  searchValue,
  patternType,
  onCommunicativeFunctionChange,
  onFixednessLevelChange,
  onRowClick,
  onSearchChange,
  onPatternTypeChange,
}: KnowledgeTableProps) {
  const columnFilters = useMemo(
    () =>
      buildColumnFilters([
        { id: "patternType", value: patternType },
        { id: "fixednessLevel", value: fixednessLevel },
        { id: "communicativeFunction", value: communicativeFunction },
      ]),
    [communicativeFunction, fixednessLevel, patternType],
  );

  function handleColumnFiltersChange(nextFilters: ColumnFiltersState) {
    onPatternTypeChange(getSingleSelectFilterValue<PatternType>(nextFilters, "patternType"));
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
          columnId: "patternType",
          options: Object.fromEntries(patternTypeValues.map((value) => [value, { label: formatPatternType(value) }])),
          title: "Pattern type",
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
