import { Button } from "@english-coach/ui";
import { useSignOutMutation } from "../mutations";
import { AuthShell } from "./auth-shell";

export function PendingState() {
  const signOutMutation = useSignOutMutation();

  return (
    <AuthShell
      title="Application pending"
      description="Your account exists, but learner access is still waiting for approval. You can safely leave this page and come back after your status changes."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">We&apos;re reviewing your access</h2>
          <p className="text-sm leading-6 text-slate-600">
            You&apos;re signed in successfully. Once your student status moves from pending to approved, the shared access guards
            will route you into the app automatically on your next visit.
          </p>
        </div>
        <Button disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()} type="button" variant="outline">
          {signOutMutation.isPending ? "Signing out..." : "Sign out"}
        </Button>
        {signOutMutation.error ? (
          <p className="text-sm text-red-600" role="alert">
            {signOutMutation.error.message}
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
