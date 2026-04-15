import { Button } from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface SubmitBarProps {
  cancelTo: string;
  isPending?: boolean;
  secondaryAction?: ReactNode;
  submitLabel: string;
}

export function SubmitBar({ cancelTo, isPending = false, secondaryAction, submitLabel }: SubmitBarProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div>{secondaryAction}</div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild type="button" variant="outline">
          <Link to={cancelTo}>Cancel</Link>
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
