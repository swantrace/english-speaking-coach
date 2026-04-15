import type { submissionJobStatusValues, submissionKindValues } from "@english-coach/domain";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";

type SubmissionJobStatus = (typeof submissionJobStatusValues)[number];
type SubmissionKind = (typeof submissionKindValues)[number];

interface JobFiltersProps {
  kind?: SubmissionKind;
  searchValue: string;
  status?: SubmissionJobStatus;
  onClear: () => void;
  onKindChange: (value?: SubmissionKind) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value?: SubmissionJobStatus) => void;
}

export function JobFilters({
  kind,
  searchValue,
  status,
  onClear,
  onKindChange,
  onSearchChange,
  onStatusChange,
}: JobFiltersProps) {
  const hasFilters = Boolean(kind || status || searchValue.trim());

  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem_12rem_auto]">
        <SearchInput onChange={onSearchChange} placeholder="Search by job ID" value={searchValue} />

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

        <Select
          onValueChange={(value) => onStatusChange(value === "all" ? undefined : (value as SubmissionJobStatus))}
          value={status ?? "all"}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="started">Started</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Button disabled={!hasFilters} onClick={onClear} type="button" variant="outline">
          Clear filters
        </Button>
      </div>
    </section>
  );
}
