import { Button } from "@english-coach/ui";
import { useSignOutMutation } from "../mutations";
import { AuthShell } from "./auth-shell";

export function RejectedState() {
  const signOutMutation = useSignOutMutation();

  return (
    <AuthShell
      title="Application not approved"
      description="This account is signed in, but access has been rejected. The guard layer keeps rejected users on this page unless their backend status changes."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">Your access request was rejected</h2>
          <p className="text-sm leading-6 text-slate-600">
            If this looks unexpected, please contact the team that manages approvals. If your status changes later, the same
            centralized auth logic will route you to the right place automatically.
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
