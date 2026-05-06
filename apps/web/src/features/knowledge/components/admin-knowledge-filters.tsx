import { communicativeFunctionValues, fixednessLevelValues, patternTypeValues } from "@english-coach/domain";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";
import { formatCommunicativeFunction, formatFixednessLevel, formatPatternType } from "@/lib/format";
import type { AdminKnowledgeReviewStatus } from "../types";

interface AdminKnowledgeFiltersProps {
  communicativeFunction?: string;
  fixednessLevel?: string;
  onClear: () => void;
  onCommunicativeFunctionChange: (value?: string) => void;
  onFixednessLevelChange: (value?: string) => void;
  onReviewStatusChange: (value?: AdminKnowledgeReviewStatus) => void;
  onSearchChange: (value: string) => void;
  onPatternTypeChange: (value?: string) => void;
  reviewStatus?: AdminKnowledgeReviewStatus;
  searchValue: string;
  patternType?: string;
}

export function AdminKnowledgeFilters({
  communicativeFunction,
  fixednessLevel,
  onClear,
  onCommunicativeFunctionChange,
  onFixednessLevelChange,
  onReviewStatusChange,
  onSearchChange,
  onPatternTypeChange,
  reviewStatus,
  searchValue,
  patternType,
}: AdminKnowledgeFiltersProps) {
  const hasFilters = Boolean(
    searchValue.trim() || reviewStatus || patternType || fixednessLevel || communicativeFunction,
  );

  return (
    <section className="space-y-4 rounded-[0.25rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_12rem_14rem_14rem_16rem_auto]">
        <SearchInput onChange={onSearchChange} placeholder="Search by pattern" value={searchValue} />

        <Select
          onValueChange={(value) =>
            onReviewStatusChange(value === "all" ? undefined : (value as AdminKnowledgeReviewStatus))
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

        <Select
          onValueChange={(value) => onPatternTypeChange(value === "all" ? undefined : value)}
          value={patternType ?? "all"}
        >
          <SelectTrigger className="bg-white">
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
          onValueChange={(value) => onFixednessLevelChange(value === "all" ? undefined : value)}
          value={fixednessLevel ?? "all"}
        >
          <SelectTrigger className="bg-white">
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
          onValueChange={(value) => onCommunicativeFunctionChange(value === "all" ? undefined : value)}
          value={communicativeFunction ?? "all"}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All functions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All functions</SelectItem>
            {communicativeFunctionValues.map((value) => (
              <SelectItem key={value} value={value}>
                {formatCommunicativeFunction(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button disabled={!hasFilters} onClick={onClear} type="button" variant="outline">
          Clear filters
        </Button>
      </div>
    </section>
  );
}
