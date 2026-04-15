import type { CommunicativeFunction, FixednessLevel, SyntaxRole } from "@english-coach/domain";
import { communicativeFunctionValues, fixednessLevelValues, syntaxRoleValues } from "@english-coach/domain";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";
import { formatCommunicativeFunction, formatFixednessLevel, formatSyntaxRole } from "@/lib/format";

interface KnowledgeFiltersProps {
  communicativeFunction?: CommunicativeFunction;
  fixednessLevel?: FixednessLevel;
  searchValue: string;
  syntaxRole?: SyntaxRole;
  onClear: () => void;
  onCommunicativeFunctionChange: (value?: CommunicativeFunction) => void;
  onFixednessLevelChange: (value?: FixednessLevel) => void;
  onSearchChange: (value: string) => void;
  onSyntaxRoleChange: (value?: SyntaxRole) => void;
}

export function KnowledgeFilters({
  communicativeFunction,
  fixednessLevel,
  searchValue,
  syntaxRole,
  onClear,
  onCommunicativeFunctionChange,
  onFixednessLevelChange,
  onSearchChange,
  onSyntaxRoleChange,
}: KnowledgeFiltersProps) {
  const hasActiveFilters =
    searchValue.trim().length > 0 || Boolean(syntaxRole) || Boolean(fixednessLevel) || Boolean(communicativeFunction);

  return (
    <section className="rounded-[0.25rem] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex-1">
          <SearchInput onChange={onSearchChange} placeholder="Search knowledge patterns" value={searchValue} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex">
          <Select
            onValueChange={(value) => onSyntaxRoleChange(value === "all" ? undefined : (value as SyntaxRole))}
            value={syntaxRole ?? "all"}
          >
            <SelectTrigger className="w-full bg-white sm:w-[220px]">
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
