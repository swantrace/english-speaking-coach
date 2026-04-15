import type { SessionType } from "@english-coach/domain";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";

interface SessionHistoryFiltersProps {
  searchValue: string;
  selectedSessionType?: SessionType;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onSessionTypeChange: (value?: SessionType) => void;
}

export function SessionHistoryFilters({
  searchValue,
  selectedSessionType,
  onClear,
  onSearchChange,
  onSessionTypeChange,
}: SessionHistoryFiltersProps) {
  const hasActiveFilters = searchValue.trim().length > 0 || Boolean(selectedSessionType);

  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <SearchInput
            onChange={onSearchChange}
            placeholder="Search sessions by title, type, or review notes"
            value={searchValue}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            onValueChange={(value) => onSessionTypeChange(value === "all" ? undefined : (value as SessionType))}
            value={selectedSessionType ?? "all"}
          >
            <SelectTrigger className="w-full bg-white sm:w-[180px]">
              <SelectValue placeholder="All session types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All session types</SelectItem>
              <SelectItem value="role-play">Role-play</SelectItem>
              <SelectItem value="free-form">Free-form</SelectItem>
            </SelectContent>
          </Select>

          <Button disabled={!hasActiveFilters} onClick={onClear} type="button" variant="outline">
            Clear filters
          </Button>
        </div>
      </div>
    </section>
  );
}
