import { Badge } from "@english-coach/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/dates";
import { formatCommunicativeFunction, formatFixednessLevel, formatSyntaxRole } from "@/lib/format";
import type { KnowledgeListItemView } from "../types";

function renderNullableValue(value: string | null) {
  return value ?? "Not specified";
}

export function createKnowledgeColumns(): ColumnDef<KnowledgeListItemView>[] {
  return [
    {
      accessorKey: "pattern",
      header: "Pattern",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-slate-950">{row.original.pattern}</p>
          <p className="text-sm text-slate-500">{formatDate(row.original.firstLearnedAt)}</p>
        </div>
      ),
    },
    {
      accessorKey: "syntaxRole",
      header: "Syntax role",
      cell: ({ row }) => (
        <Badge variant="outline">
          {renderNullableValue(row.original.syntaxRole ? formatSyntaxRole(row.original.syntaxRole) : null)}
        </Badge>
      ),
    },
    {
      accessorKey: "fixednessLevel",
      header: "Fixedness",
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">
          {renderNullableValue(row.original.fixednessLevel ? formatFixednessLevel(row.original.fixednessLevel) : null)}
        </span>
      ),
    },
    {
      accessorKey: "communicativeFunction",
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
