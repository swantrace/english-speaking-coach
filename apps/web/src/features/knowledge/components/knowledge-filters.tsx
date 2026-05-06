import type { CommunicativeFunction, FixednessLevel, PatternType } from "@english-coach/domain";
import { communicativeFunctionValues, fixednessLevelValues, patternTypeValues } from "@english-coach/domain";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";
import { formatCommunicativeFunction, formatFixednessLevel, formatPatternType } from "@/lib/format";

interface KnowledgeFiltersProps {
  communicativeFunction?: CommunicativeFunction;
  fixednessLevel?: FixednessLevel;
  searchValue: string;
  patternType?: PatternType;
  onClear: () => void;
  onCommunicativeFunctionChange: (value?: CommunicativeFunction) => void;
  onFixednessLevelChange: (value?: FixednessLevel) => void;
  onSearchChange: (value: string) => void;
  onPatternTypeChange: (value?: PatternType) => void;
}

export function KnowledgeFilters({
  communicativeFunction,
  fixednessLevel,
  searchValue,
  patternType,
  onClear,
  onCommunicativeFunctionChange,
  onFixednessLevelChange,
  onSearchChange,
  onPatternTypeChange,
}: KnowledgeFiltersProps) {
  const hasActiveFilters =
    searchValue.trim().length > 0 || Boolean(patternType) || Boolean(fixednessLevel) || Boolean(communicativeFunction);

  return (
    <section className="rounded-[0.25rem] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex-1">
          <SearchInput onChange={onSearchChange} placeholder="Search knowledge patterns" value={searchValue} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex">
          <Select
            onValueChange={(value) => onPatternTypeChange(value === "all" ? undefined : (value as PatternType))}
            value={patternType ?? "all"}
          >
            <SelectTrigger className="w-full bg-white sm:w-[220px]">
              <SelectValue placeholder="All pattern types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pattern types</SelectItem>
              {patternTypeValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {formatPatternType(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => onFixednessLevelChange(value === "all" ? undefined : (value as FixednessLevel))}
            value={fixednessLevel ?? "all"}
          >
            <SelectTrigger className="w-full bg-white sm:w-[220px]">
              <SelectValue placeholder="All fixedness levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fixedness levels</SelectItem>
              {fixednessLevelValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {formatFixednessLevel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) =>
              onCommunicativeFunctionChange(value === "all" ? undefined : (value as CommunicativeFunction))
            }
            value={communicativeFunction ?? "all"}
          >
            <SelectTrigger className="w-full bg-white sm:w-[260px]">
              <SelectValue placeholder="All communicative functions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All communicative functions</SelectItem>
              {communicativeFunctionValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {formatCommunicativeFunction(value)}
                </SelectItem>
              ))}
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
