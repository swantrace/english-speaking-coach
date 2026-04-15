import type { submissionKindValues } from "@english-coach/domain";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";

type SubmissionKind = (typeof submissionKindValues)[number];

interface SubmissionFiltersProps {
  kind?: SubmissionKind;
  searchValue: string;
  onClear: () => void;
  onKindChange: (value?: SubmissionKind) => void;
  onSearchChange: (value: string) => void;
}

export function SubmissionFilters({
  kind,
  searchValue,
  onClear,
  onKindChange,
  onSearchChange,
}: SubmissionFiltersProps) {
  const hasFilters = Boolean(kind || searchValue.trim());

  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem_auto]">
        <SearchInput onChange={onSearchChange} placeholder="Search by submission ID" value={searchValue} />

        <Select
          onValueChange={(value) => onKindChange(value === "all" ? undefined : (value as SubmissionKind))}
          value={kind ?? "all"}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All kinds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            <SelectItem value="scenario.generate">Scenario generation</SelectItem>
            <SelectItem value="knowledge.generate">Knowledge generation</SelectItem>
            <SelectItem value="session.analysis">Session analysis</SelectItem>
          </SelectContent>
        </Select>

        <Button disabled={!hasFilters} onClick={onClear} type="button" variant="outline">
          Clear filters
        </Button>
      </div>
    </section>
  );
}
