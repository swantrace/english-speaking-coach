import type { KnowledgeItem } from "@english-coach/contract";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from "@english-coach/ui";
import type { useKnowledgeGenerateHistory, useKnowledgeItemsList } from "../../lib/app-data";
import { ellipsize, formatClock, formatTimestamp, getJobStatusTone } from "../../lib/app-data";
import { Card, PageState } from "../../lib/app-shell";

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
            <h2 className="text-2xl text-slate-950">Bulk generation</h2>
            <p className="text-sm leading-7 text-slate-600">
              Queue one prompt per line. Completed jobs land in pending review instead of showing up as approved items.
            </p>
          </div>
          <Textarea
            className="min-h-44 border-slate-200 bg-white text-sm leading-7 text-slate-900"
            onChange={(event) => onMessageChange(event.target.value)}
            value={message}
          />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              checked={shouldFail}
              className="h-4 w-4 rounded border-slate-300 bg-white"
              onChange={(event) => onShouldFailChange(event.target.checked)}
              type="checkbox"
            />
            Simulate worker failure for this submission
          </label>
          {store.lastError ? <p className="text-sm text-rose-700">{store.lastError}</p> : null}
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
            <h2 className="text-2xl text-slate-950">Recent submissions</h2>
            <p className="text-sm leading-7 text-slate-600">
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
                <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5" key={submission.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid gap-1">
                      <h3 className="text-lg text-slate-950">Submission {ellipsize(submission.id, 18)}</h3>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {submission.totalCount} requested · updated {formatTimestamp(submission.updatedAt)}
                      </p>
                    </div>
                    <Button onClick={() => onReconnectStream(submission.eventsUrl)} size="sm" variant="outline">
                      Reconnect stream
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {submission.summary.totalJobs} jobs
                    </span>
                    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-emerald-900">
                      {submission.summary.completed} completed
                    </span>
                    <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-amber-900">
                      {submission.summary.started} started
                    </span>
                    <span className="rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-sky-900">
                      {submission.summary.queued} queued
                    </span>
                    <span className="rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-rose-900">
                      {submission.summary.failed} failed
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {submission.jobs.length ? (
                      submission.jobs.map((job) => (
                        <div className="rounded-[18px] border border-slate-200 bg-white p-4" key={job.jobId}>
                          <div className="flex items-center justify-between gap-4">
                            <span className="max-w-[72%] truncate text-sm text-slate-800">{job.message}</span>
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
                      <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                        No persisted jobs for this submission yet.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 lg:col-span-2">
                {generationHistory.isPending
                  ? "Loading submission history..."
                  : "No recent knowledge-generation submissions yet."}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="grid gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-2">
            <h2 className="text-2xl text-slate-950">Pending review queue</h2>
            <p className="text-sm leading-7 text-slate-600">
              Generated knowledge items stay admin-only until an operator reviews and approves them.
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
                  <TableHead className="text-slate-600">Pattern</TableHead>
                  <TableHead className="text-slate-600">Submission</TableHead>
                  <TableHead className="text-slate-600">Updated</TableHead>
                  <TableHead className="text-right text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReview.data?.items.length ? (
                  pendingReview.data.items.map((item) => (
                    <TableRow className="border-slate-200" key={item.id}>
                      <TableCell>
                        <div className="grid gap-1">
                          <span className="font-medium text-slate-900">{item.pattern}</span>
                          <span className="text-xs leading-6 text-slate-500">
                            {ellipsize(item.example ?? "No example", 110)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {item.submissionId ? ellipsize(item.submissionId, 18) : "Manual"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{formatTimestamp(item.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button onClick={() => onOpenPendingReview(item)} size="sm" variant="outline">
                            Review
                          </Button>
                          <Button
                            className="border border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200"
                            disabled={reviewMutationPending}
                            onClick={() => onApprovePendingReview(item)}
                            size="sm"
                          >
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
                      {pendingReview.isPending
                        ? "Loading review queue..."
                        : "No knowledge items are waiting for review."}
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
