import type { KnowledgeItem } from "@english-coach/contract";
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

export function DeleteKnowledgeItemDialog({
  isPending,
  knowledgeItem,
  onConfirm,
  onOpenChange,
}: {
  isPending: boolean;
  knowledgeItem: KnowledgeItem | null;
  onConfirm: (knowledgeItemId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={Boolean(knowledgeItem)}>
      <AlertDialogContent className="border-white/10 bg-slate-950 text-slate-50">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete knowledge item</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            {knowledgeItem
              ? `Delete ${knowledgeItem.pattern}? This removes it from the admin knowledge catalog.`
              : "Delete this knowledge item?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/10 bg-transparent text-slate-100">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 text-white hover:bg-rose-500"
            onClick={() => (knowledgeItem ? onConfirm(knowledgeItem.id) : undefined)}
          >
            {isPending ? "Deleting..." : "Delete knowledge item"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}