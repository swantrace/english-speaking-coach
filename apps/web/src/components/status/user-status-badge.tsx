import type { UserStatus } from "@english-coach/domain";
import { Badge } from "@english-coach/ui";

interface UserStatusBadgeProps {
  status: UserStatus;
}

const badgeClassNames: Record<UserStatus, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  deleted: "border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-100",
  pending: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  rejected: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50",
};

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  return (
    <Badge className={badgeClassNames[status]} variant="outline">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
