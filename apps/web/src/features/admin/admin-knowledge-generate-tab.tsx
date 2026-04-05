import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from "@english-coach/ui";
import type { KnowledgeItem } from "@english-coach/contract";
import type { useKnowledgeGenerateHistory, useKnowledgeItemsList } from "../../lib/app-data";
import { Card, PageState } from "../../lib/app-shell";
import { ellipsize, formatClock, formatTimestamp, getJobStatusTone } from "../../lib/app-data";

export function AdminKnowledgeGenerateTab({
  batchCount,
  generationHistory,
  message,
  onMessageChange,
  onReconnectStream,
  onRefreshGenerationHistory,
  onRefreshPendingReview,
  onApprovePendingReview,
  onOpenPendingReview,
  onRejectPendingReview,
  onShouldFailChange,
  onSubmitBatch,
  reviewMutationPending,
  pendingReview,
  shouldFail,
  store,
}: {
  batchCount: number;
  generationHistory: ReturnType<typeof useKnowledgeGenerateHistory>;
  message: string;
  onMessageChange: (value: string) => void;
  onReconnectStream: (eventsUrl: string) => void;
  onRefreshGenerationHistory: () => void;
  onRefreshPendingReview: () => void;
  onApprovePendingReview: (item: KnowledgeItem) => void;
  onOpenPendingReview: (item: KnowledgeItem) => void;
  onRejectPendingReview: (item: KnowledgeItem) => void;
  onShouldFailChange: (value: boolean) => void;
  onSubmitBatch: () => void;
  reviewMutationPending: boolean;
  pendingReview: ReturnType<typeof useKnowledgeItemsList>;
  shouldFail: boolean;
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
            <h2 className="text-2xl text-white">Bulk generation</h2>
            <p className="text-sm leading-7 text-slate-300">
              Queue one prompt per line. Completed jobs land in pending review instead of showing up as approved items.
            </p>
          </div>
          <Textarea
            className="min-h-44 border-white/10 bg-slate-950/65 text-sm leading-7 text-slate-50"
            onChange={(event) => onMessageChange(event.target.value)}
            value={message}
          />
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input
              checked={shouldFail}
              className="h-4 w-4 rounded border-white/20 bg-slate-900"
              onChange={(event) => onShouldFailChange(event.target.checked)}
              type="checkbox"
            />
            Simulate worker failure for this submission
          </label>
          {store.lastError ? <p className="text-sm text-rose-300">{store.lastError}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={store.submitState === "submitting" || batchCount === 0} onClick={onSubmitBatch} size="lg">
              {store.submitState === "submitting" ? "Submitting..." : `Queue ${batchCount} jobs`}
            </Button>
            <Button onClick={onRefreshPendingReview} variant="outline">
              Refresh review queue
            </Button>
            <Button onClick={onRefreshGenerationHistory} variant="outline">
              Refresh submission history
            </Button>
          </div>
        </Card>

        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl text-white">Live queue state</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{store.jobs.length} jobs tracked</span>
          </div>
          <div className="grid gap-3">
            {store.jobs.length ? (
              store.jobs.map((job) => (
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4" key={job.jobId}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="max-w-[68%] truncate text-sm text-white">{job.message}</span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getJobStatusTone(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
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
              <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                No queued jobs yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="grid gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-2">
            <h2 className="text-2xl text-white">Recent submissions</h2>
            <p className="text-sm leading-7 text-slate-300">
              Revisit recent knowledge-generation batches after reload and reconnect the live stream for any submission.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {generationHistory.data?.items.length ?? 0} tracked
          </span>
        </div>

        {generationHistory.error ? (
          <PageState description={generationHistory.error.message} title="Could not load submission history" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {generationHistory.data?.items.length ? (
              generationHistory.data.items.map((submission) => (
                <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5" key={submission.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid gap-1">
                      <h3 className="text-lg text-white">Submission {ellipsize(submission.id, 18)}</h3>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {submission.totalCount} requested · updated {formatTimestamp(submission.updatedAt)}
                      </p>
                    </div>
                    <Button onClick={() => onReconnectStream(submission.eventsUrl)} size="sm" variant="outline">
                      Reconnect stream
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {submission.summary.totalJobs} jobs
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                      {submission.summary.completed} completed
                    </span>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
                      {submission.summary.started} started
                    </span>
                    <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sky-100">
                      {submission.summary.queued} queued
                    </span>
                    <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100">
                      {submission.summary.failed} failed
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {submission.jobs.length ? (
                      submission.jobs.map((job) => (
                        <div className="rounded-[18px] border border-white/10 bg-slate-950/55 p-4" key={job.jobId}>
                          <div className="flex items-center justify-between gap-4">
                            <span className="max-w-[72%] truncate text-sm text-slate-100">{job.message}</span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getJobStatusTone(job.status)}`}
                            >
                              {job.status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
                            <span>{job.progress}%</span>
                            <span>{formatTimestamp(job.processedAt ?? job.queuedAt)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                        No persisted jobs for this submission yet.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500 lg:col-span-2">
                {generationHistory.isPending ? "Loading submission history..." : "No recent knowledge-generation submissions yet."}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="grid gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-2">
            <h2 className="text-2xl text-white">Pending review queue</h2>
            <p className="text-sm leading-7 text-slate-300">
              Generated knowledge items stay admin-only until an operator reviews and approves them.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{pendingReview.data?.total ?? 0} pending</span>
        </div>

        {pendingReview.error ? (
          <PageState description={pendingReview.error.message} title="Could not load the review queue" />
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-300">Pattern</TableHead>
                  <TableHead className="text-slate-300">Submission</TableHead>
                  <TableHead className="text-slate-300">Updated</TableHead>
                  <TableHead className="text-right text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReview.data?.items.length ? (
                  pendingReview.data.items.map((item) => (
                    <TableRow className="border-white/10" key={item.id}>
                      <TableCell>
                        <div className="grid gap-1">
                          <span className="font-medium text-slate-50">{item.pattern}</span>
                          <span className="text-xs leading-6 text-slate-400">{ellipsize(item.example ?? "No example", 110)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {item.submissionId ? ellipsize(item.submissionId, 18) : "Manual"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">{formatTimestamp(item.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button onClick={() => onOpenPendingReview(item)} size="sm" variant="outline">
                            Review
                          </Button>
                          <Button disabled={reviewMutationPending} onClick={() => onApprovePendingReview(item)} size="sm">
                            Approve
                          </Button>
                          <Button
                            disabled={reviewMutationPending}
                            onClick={() => onRejectPendingReview(item)}
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
                  <TableRow className="border-white/10">
                    <TableCell className="h-24 text-center text-slate-400" colSpan={4}>
                      {pendingReview.isPending ? "Loading review queue..." : "No knowledge items are waiting for review."}
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