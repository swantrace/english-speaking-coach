import { Button } from "@english-coach/ui";
import { FilterChipGroup } from "@/components/app/filter-chip-group";
import { SearchInput } from "@/components/app/search-input";

interface ScenarioFilterBarProps {
  availableTags: string[];
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  searchValue: string;
  selectedTags: string[];
}

export function ScenarioFilterBar({
  availableTags,
  onClearFilters,
  onSearchChange,
  onToggleTag,
  searchValue,
  selectedTags,
}: ScenarioFilterBarProps) {
  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-stone-50/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <SearchInput
            onChange={onSearchChange}
            placeholder="Search scenarios by title or setting"
            value={searchValue}
          />
          {availableTags.length > 0 ? (
            <FilterChipGroup onToggle={onToggleTag} options={availableTags} selectedValues={selectedTags} />
          ) : (
            <p className="text-sm text-slate-500">Tags will appear here when matching scenarios are available.</p>
          )}
        </div>
        <Button onClick={onClearFilters} type="button" variant="ghost">
          Clear filters
        </Button>
      </div>
    </section>
  );
}
