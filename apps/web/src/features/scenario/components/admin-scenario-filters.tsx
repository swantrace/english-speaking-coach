import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { FilterChipGroup } from "@/components/app/filter-chip-group";
import { SearchInput } from "@/components/app/search-input";
import type { AdminScenarioReviewStatus } from "../types";

interface AdminScenarioFiltersProps {
  availableTags: string[];
  onClear: () => void;
  onReviewStatusChange: (value?: AdminScenarioReviewStatus) => void;
  onSearchChange: (value: string) => void;
  onTagToggle: (value: string) => void;
  reviewStatus?: AdminScenarioReviewStatus;
  searchValue: string;
  selectedTags: string[];
}

export function AdminScenarioFilters({
  availableTags,
  onClear,
  onReviewStatusChange,
  onSearchChange,
  onTagToggle,
  reviewStatus,
  searchValue,
  selectedTags,
}: AdminScenarioFiltersProps) {
  const hasFilters = Boolean(searchValue.trim() || reviewStatus || selectedTags.length > 0);

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <SearchInput onChange={onSearchChange} placeholder="Search by title or setting" value={searchValue} />

        <Select
          onValueChange={(value) =>
            onReviewStatusChange(value === "all" ? undefined : (value as AdminScenarioReviewStatus))
          }
          value={reviewStatus ?? "all"}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All review states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All review states</SelectItem>
            <SelectItem value="pendingReview">Pending review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>

        <Button disabled={!hasFilters} onClick={onClear} type="button" variant="outline">
          Clear filters
        </Button>
      </div>

      {availableTags.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Filter by tags</p>
          <FilterChipGroup onToggle={onTagToggle} options={availableTags} selectedValues={selectedTags} />
        </div>
      ) : null}
    </section>
  );
}
