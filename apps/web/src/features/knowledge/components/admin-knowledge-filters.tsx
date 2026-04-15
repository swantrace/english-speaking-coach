import { communicativeFunctionValues, fixednessLevelValues, syntaxRoleValues } from "@english-coach/domain";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";
import { formatCommunicativeFunction, formatFixednessLevel, formatSyntaxRole } from "@/lib/format";
import type { AdminKnowledgeReviewStatus } from "../types";

interface AdminKnowledgeFiltersProps {
  communicativeFunction?: string;
  fixednessLevel?: string;
  onClear: () => void;
  onCommunicativeFunctionChange: (value?: string) => void;
  onFixednessLevelChange: (value?: string) => void;
  onReviewStatusChange: (value?: AdminKnowledgeReviewStatus) => void;
  onSearchChange: (value: string) => void;
  onSyntaxRoleChange: (value?: string) => void;
  reviewStatus?: AdminKnowledgeReviewStatus;
  searchValue: string;
  syntaxRole?: string;
}

export function AdminKnowledgeFilters({
  communicativeFunction,
  fixednessLevel,
  onClear,
  onCommunicativeFunctionChange,
  onFixednessLevelChange,
  onReviewStatusChange,
  onSearchChange,
  onSyntaxRoleChange,
  reviewStatus,
  searchValue,
  syntaxRole,
}: AdminKnowledgeFiltersProps) {
  const hasFilters = Boolean(
    searchValue.trim() || reviewStatus || syntaxRole || fixednessLevel || communicativeFunction,
  );

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
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
          onValueChange={(value) => onSyntaxRoleChange(value === "all" ? undefined : value)}
          value={syntaxRole ?? "all"}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All syntax roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All syntax roles</SelectItem>
            {syntaxRoleValues.map((value) => (
              <SelectItem key={value} value={value}>
                {formatSyntaxRole(value)}
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
