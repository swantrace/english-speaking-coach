import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@english-coach/ui";
import { useSessionRuntimeStore } from "../runtime/store";

interface EndSessionDialogProps {
  errorMessage: string | null;
  isPending: boolean;
  onConfirm: () => void;
}

export function EndSessionDialog({ errorMessage, isPending, onConfirm }: EndSessionDialogProps) {
  const endSessionDialogOpen = useSessionRuntimeStore((state) => state.endSessionDialogOpen);
  const setEndSessionDialogOpen = useSessionRuntimeStore((state) => state.setEndSessionDialogOpen);

  return (
    <Dialog onOpenChange={setEndSessionDialogOpen} open={endSessionDialogOpen}>
      <DialogContent showClose={!isPending}>
        <DialogHeader>
          <DialogTitle>End this live session?</DialogTitle>
          <DialogDescription>
            This closes the active room and sends you back to the session detail page. Use this once you’re genuinely
            done practicing.
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <DialogFooter>
          <Button disabled={isPending} onClick={() => setEndSessionDialogOpen(false)} type="button" variant="outline">
            Keep practicing
          </Button>
          <Button disabled={isPending} onClick={onConfirm} type="button">
            {isPending ? "Ending session..." : "End session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
