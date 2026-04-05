import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@english-coach/ui";
import { Link } from "@tanstack/react-router";
import { formatTimestamp, humanizeLabel, useKnowledgePointDetail } from "../../lib/app-data";
import { LoadingPanel, PageState } from "../../lib/app-shell";

export function KnowledgePointDetailDialog({
  knowledgePointId,
  onOpenChange,
  open,
}: {
  knowledgePointId?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const detail = useKnowledgePointDetail(knowledgePointId);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl border-slate-200 bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>{detail.data?.pattern ?? "Knowledge point"}</DialogTitle>
          <DialogDescription className="text-slate-600">
            Review where this pattern showed up in your history and jump straight to the transcript turn.
          </DialogDescription>
        </DialogHeader>

        {detail.isPending ? <LoadingPanel label="Loading knowledge point details..." /> : null}
        {detail.error ? (
          <PageState description={detail.error.message} title="Could not load knowledge point details" />
        ) : null}
        {detail.data ? (
          <div className="grid gap-6">
            <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5 md:grid-cols-4">
              <div className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Function</span>
                <span className="text-sm text-slate-700">{humanizeLabel(detail.data.communicativeFunction)}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Sessions</span>
                <span className="text-sm text-slate-700">{detail.data.sessionCount}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Occurrences</span>
                <span className="text-sm text-slate-700">{detail.data.totalOccurrences}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Last seen</span>
                <span className="text-sm text-slate-700">{formatTimestamp(detail.data.lastSeenAt)}</span>
              </div>
            </div>

            {detail.data.example ? (
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                Example: “{detail.data.example}”
              </div>
            ) : null}

            {detail.data.occurrences.length ? (
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg text-slate-950">Transcript links</h3>
                  <span className="text-sm text-slate-500">{detail.data.occurrences.length} linked turns</span>
                </div>
                <div className="max-h-[26rem] overflow-auto rounded-[20px] border border-slate-200 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="text-slate-600">Excerpt</TableHead>
                        <TableHead className="text-slate-600">Speaker</TableHead>
                        <TableHead className="text-slate-600">Session</TableHead>
                        <TableHead className="text-slate-600">Turn</TableHead>
                        <TableHead className="text-right text-slate-600">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.data.occurrences.map((occurrence) => (
                        <TableRow className="border-slate-200" key={occurrence.id}>
                          <TableCell className="max-w-xl text-sm leading-7 text-slate-700">
                            “{occurrence.excerpt}”
                            {occurrence.occurrenceCount > 1 ? (
                              <span className="ml-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                                x{occurrence.occurrenceCount}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {occurrence.speaker === "user" ? "You" : "Agent"}
                          </TableCell>
                          <TableCell>
                            <div className="grid gap-1 text-sm text-slate-700">
                              <span>{occurrence.sessionTitle}</span>
                              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                {occurrence.sessionType} ·{" "}
                                {formatTimestamp(occurrence.sessionEndedAt ?? occurrence.sessionStartedAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">#{occurrence.transcriptTurnIndex + 1}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link
                                params={{ sessionId: occurrence.sessionHistoryId }}
                                search={{ tab: "transcript", turn: occurrence.transcriptTurnIndex }}
                                to="/history/$sessionId"
                              >
                                Open turn
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <PageState
                description="The session aggregate exists, but transcript turn links have not been recorded for this item yet."
                title="No linked transcript turns"
              />
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
