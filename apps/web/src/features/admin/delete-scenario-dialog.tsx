import type { Scenario } from "@english-coach/contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@english-coach/ui";

export function DeleteScenarioDialog({
  isPending,
  onConfirm,
  onOpenChange,
  scenario,
}: {
  isPending: boolean;
  onConfirm: (scenarioId: string) => void;
  onOpenChange: (open: boolean) => void;
  scenario: Scenario | null;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={Boolean(scenario)}>
      <AlertDialogContent className="border-white/10 bg-slate-950 text-slate-50">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete scenario</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            {scenario
              ? `Delete ${scenario.title}? This removes it from admin management and learner browsing.`
              : "Delete this scenario?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/10 bg-transparent text-slate-100">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 text-white hover:bg-rose-500"
            onClick={() => (scenario ? onConfirm(scenario.id) : undefined)}
          >
            {isPending ? "Deleting..." : "Delete scenario"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
