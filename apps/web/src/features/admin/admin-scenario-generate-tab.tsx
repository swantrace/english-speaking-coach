import type { Scenario } from "@english-coach/contract";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from "@english-coach/ui";
import type { useAdminScenarios } from "../../lib/app-data";
import { ellipsize, formatClock, formatTimestamp, getJobStatusTone } from "../../lib/app-data";
import { Card, PageState } from "../../lib/app-shell";

export function AdminScenarioGenerateTab({
  batchCount,
  message,
  onApprovePendingReview,
  onMessageChange,
  onOpenPendingReview,
  onRefreshPendingReview,
  onRejectPendingReview,
  onSubmitBatch,
  pendingReview,
  reviewMutationPending,
  store,
}: {
  batchCount: number;
  message: string;
  onApprovePendingReview: (scenario: Scenario) => void;
  onMessageChange: (value: string) => void;
  onOpenPendingReview: (scenario: Scenario) => void;
  onRefreshPendingReview: () => void;
  onRejectPendingReview: (scenario: Scenario) => void;
  onSubmitBatch: () => void;
  pendingReview: ReturnType<typeof useAdminScenarios>;
  reviewMutationPending: boolean;
  store: {
    connectionState: "closed" | "connecting" | "open" | "error";
    jobs: Array<{
      jobId: string;
      message: string;
      progress: number;
      status: "queued" | "started" | "completed" | "failed";
      updatedAt?: string;
    }>;
    lastError?: string;
    submitState: "idle" | "submitting";
  };
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="grid gap-5">
          <div className="grid gap-2">
            <h2 className="text-2xl text-slate-950">Bulk generation</h2>
            <p className="text-sm leading-7 text-slate-600">
              Queue one prompt per line. Completed jobs now land in pending review instead of publishing directly.
            </p>
          </div>
          <Textarea
            className="min-h-44 border-slate-200 bg-white text-sm leading-7 text-slate-900"
            onChange={(event) => onMessageChange(event.target.value)}
            value={message}
          />
          {store.lastError ? <p className="text-sm text-rose-700">{store.lastError}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={store.submitState === "submitting" || batchCount === 0} onClick={onSubmitBatch} size="lg">
              {store.submitState === "submitting" ? "Submitting..." : `Queue ${batchCount} jobs`}
            </Button>
            <Button onClick={onRefreshPendingReview} variant="outline">
              Refresh review queue
            </Button>
          </div>
        </Card>

        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl text-slate-950">Live queue state</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{store.jobs.length} jobs tracked</span>
          </div>
          <div className="grid gap-3">
            {store.jobs.length ? (
              store.jobs.map((job) => (
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4" key={job.jobId}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="max-w-[68%] truncate text-sm text-slate-800">{job.message}</span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getJobStatusTone(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,197,94,0.7),rgba(56,189,248,0.95))] transition-[width] duration-500"
                      style={{ width: `${Math.max(job.progress, 4)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
                    <span>{job.progress}%</span>
                    <span>{formatClock(job.updatedAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No queued jobs yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="grid gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-2">
            <h2 className="text-2xl text-slate-950">Pending review queue</h2>
            <p className="text-sm leading-7 text-slate-600">
              Generated scenarios remain hidden from learners until an admin approves them.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {pendingReview.data?.total ?? 0} pending
          </span>
        </div>

        {pendingReview.error ? (
          <PageState description={pendingReview.error.message} title="Could not load the review queue" />
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-600">Scenario</TableHead>
                  <TableHead className="text-slate-600">Submission</TableHead>
                  <TableHead className="text-slate-600">Updated</TableHead>
                  <TableHead className="text-right text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReview.data?.items.length ? (
                  pendingReview.data.items.map((scenario) => (
                    <TableRow className="border-slate-200" key={scenario.id}>
                      <TableCell>
                        <div className="grid gap-1">
                          <span className="font-medium text-slate-900">{scenario.title}</span>
                          <span className="text-xs leading-6 text-slate-500">{ellipsize(scenario.setting, 110)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {scenario.submissionId ? ellipsize(scenario.submissionId, 18) : "Manual"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{formatTimestamp(scenario.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button onClick={() => onOpenPendingReview(scenario)} size="sm" variant="outline">
                            Review
                          </Button>
                          <Button
                            className="border border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200"
                            disabled={reviewMutationPending}
                            onClick={() => onApprovePendingReview(scenario)}
                            size="sm"
                          >
                            Approve
                          </Button>
                          <Button
                            disabled={reviewMutationPending}
                            onClick={() => onRejectPendingReview(scenario)}
                            size="sm"
                            variant="outline"
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-slate-200">
                    <TableCell className="h-24 text-center text-slate-500" colSpan={4}>
                      {pendingReview.isPending ? "Loading review queue..." : "No scenarios are waiting for review."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
