import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";
import type { ProposedOccurrenceListFilters } from "./types";

interface OccurrenceFiltersProps {
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value?: ProposedOccurrenceListFilters["status"]) => void;
  searchValue: string;
  status?: ProposedOccurrenceListFilters["status"];
}

export function OccurrenceFilters({
  onClear,
  onSearchChange,
  onStatusChange,
  searchValue,
  status,
}: OccurrenceFiltersProps) {
  const hasFilters = Boolean(searchValue.trim() || status);

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <SearchInput onChange={onSearchChange} placeholder="Search by pattern or transcript" value={searchValue} />

        <Select
          onValueChange={(value) =>
            onStatusChange(value === "all" ? undefined : (value as ProposedOccurrenceListFilters["status"]))
          }
          value={status ?? "all"}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="proposed">Proposed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Button disabled={!hasFilters} onClick={onClear} type="button" variant="outline">
          Clear filters
        </Button>
      </div>
    </section>
  );
}
