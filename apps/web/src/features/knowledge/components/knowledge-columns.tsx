import { Badge } from "@english-coach/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { includesSelectedValues } from "@/components/data-table/filter-fns";
import { formatDate } from "@/lib/dates";
import { formatCommunicativeFunction, formatFixednessLevel, formatPatternType } from "@/lib/format";
import type { KnowledgeListItemView } from "../types";

function renderNullableValue(value: string | null) {
  return value ?? "Not specified";
}

export function createKnowledgeColumns(): ColumnDef<KnowledgeListItemView>[] {
  const multiValueFilter = includesSelectedValues<KnowledgeListItemView>();

  return [
    {
      accessorKey: "pattern",
      header: "Pattern",
      cell: ({ row }) => (
        <div className="max-w-[20rem] space-y-1">
          <p className="truncate font-medium text-slate-950">{row.original.pattern}</p>
          <p className="text-sm text-slate-500">{formatDate(row.original.firstLearnedAt)}</p>
        </div>
      ),
    },
    {
      accessorKey: "patternType",
      filterFn: multiValueFilter,
      header: "Pattern type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {renderNullableValue(row.original.patternType ? formatPatternType(row.original.patternType) : null)}
        </Badge>
      ),
    },
    {
      accessorKey: "fixednessLevel",
      filterFn: multiValueFilter,
      header: "Fixedness",
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">
          {renderNullableValue(row.original.fixednessLevel ? formatFixednessLevel(row.original.fixednessLevel) : null)}
        </span>
      ),
    },
    {
      accessorKey: "communicativeFunction",
      filterFn: multiValueFilter,
      header: "Communicative function",
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">
          {renderNullableValue(
            row.original.communicativeFunction ? formatCommunicativeFunction(row.original.communicativeFunction) : null,
          )}
        </span>
      ),
    },
    {
      accessorKey: "occurrenceCount",
      header: "Occurrences",
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">{row.original.occurrenceCount.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: "firstLearnedAt",
      header: "First learned",
      cell: ({ row }) => <span className="text-sm text-slate-700">{formatDate(row.original.firstLearnedAt)}</span>,
    },
  ];
}
