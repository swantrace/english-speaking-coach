import type { UserRole, UserStatus } from "@english-coach/domain";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { SearchInput } from "@/components/app/search-input";

interface UserFiltersProps {
  searchValue: string;
  role?: UserRole;
  status?: UserStatus;
  onSearchChange: (value: string) => void;
  onRoleChange: (value?: UserRole) => void;
  onStatusChange: (value?: UserStatus) => void;
  onClear: () => void;
}

export function UserFilters({
  searchValue,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onClear,
}: UserFiltersProps) {
  const hasFilters = Boolean(searchValue.trim() || role || status);

  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
        <SearchInput onChange={onSearchChange} placeholder="Search by email" value={searchValue} />

        <Select
          onValueChange={(value) => onRoleChange(value === "all" ? undefined : (value as UserRole))}
          value={role ?? "all"}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => onStatusChange(value === "all" ? undefined : (value as UserStatus))}
          value={status ?? "all"}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>

        <Button disabled={!hasFilters} onClick={onClear} type="button" variant="outline">
          Clear filters
        </Button>
      </div>
    </section>
  );
}
