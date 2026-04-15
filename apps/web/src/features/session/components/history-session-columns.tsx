import { Badge } from "@english-coach/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { includesSelectedValues } from "@/components/data-table/filter-fns";
import { formatDate } from "@/lib/dates";
import { formatDurationSeconds, formatSessionType } from "@/lib/format";
import type { SessionHistoryListItemView } from "../types";

export function createHistorySessionColumns(): ColumnDef<SessionHistoryListItemView>[] {
  const multiValueFilter = includesSelectedValues<SessionHistoryListItemView>();

  return [
    {
      accessorKey: "title",
      header: "Session",
      cell: ({ row }) => (
        <div className="max-w-[20rem] space-y-1">
          <p className="truncate font-medium text-slate-950">{row.original.title}</p>
          <p className="text-sm text-slate-500">{formatDate(row.original.date)}</p>
        </div>
      ),
    },
    {
      accessorKey: "sessionType",
      filterFn: multiValueFilter,
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{formatSessionType(row.original.sessionType)}</Badge>,
    },
    {
      accessorKey: "durationSeconds",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">{formatDurationSeconds(row.original.durationSeconds)}</span>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-sm text-slate-700">{formatDate(row.original.date)}</span>,
    },
  ];
}
