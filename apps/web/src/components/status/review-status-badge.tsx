import { Badge, cn } from "@english-coach/ui";

interface ReviewStatusBadgeProps {
  isPendingReview: boolean;
}

export function ReviewStatusBadge({ isPendingReview }: ReviewStatusBadgeProps) {
  return (
    <Badge
      className={cn(
        isPendingReview
          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50"
          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
      )}
      variant="outline"
    >
      {isPendingReview ? "Pending review" : "Approved"}
    </Badge>
  );
}
