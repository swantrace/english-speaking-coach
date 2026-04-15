import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import type { AdminSubmissionListPageView } from "../submissions/types";
import { mergeAdminJobWithStreamEvent } from "./api";
import { connectAdminJobStream } from "./sse";
import type { AdminJobDetailView, AdminJobListPageView, JobStreamConnectionState } from "./types";

export function useJobStream(submissionId: string) {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<JobStreamConnectionState>("connecting");

  useEffect(() => {
    if (!submissionId) {
      setConnectionState("closed");
      return;
    }

    setConnectionState("connecting");

    const disconnect = connectAdminJobStream({
      submissionId,
      onError: () => {
        setConnectionState("error");
      },
      onEvent: (event) => {
        setConnectionState("open");
        queryClient.setQueriesData<AdminJobListPageView>(
          { queryKey: queryKeys.admin.submissions.jobs.all(submissionId) },
          (current) =>
            current
              ? {
                  ...current,
                  items: current.items.map((item) =>
                    item.jobId === event.jobId ? mergeAdminJobWithStreamEvent(item, event) : item,
                  ),
                }
              : current,
        );
        queryClient.setQueryData<AdminJobDetailView>(
          queryKeys.admin.submissions.jobs.detail(submissionId, event.jobId),
          (current) => (current ? (mergeAdminJobWithStreamEvent(current, event) as AdminJobDetailView) : current),
        );
        queryClient.setQueriesData<AdminSubmissionListPageView>(
          { queryKey: queryKeys.admin.submissions.all() },
          (current) =>
            current
              ? {
                  ...current,
                  items: current.items.map((item) =>
                    item.id === submissionId
                      ? {
                          ...item,
                          updatedAt: event.processedAt ?? item.updatedAt,
                          updatedAtLabel: event.processedAt ? formatDateTime(event.processedAt) : item.updatedAtLabel,
                        }
                      : item,
                  ),
                }
              : current,
        );
      },
      onOpen: () => {
        setConnectionState("open");
      },
      onSystemEvent: (status) => {
        setConnectionState(status === "connected" ? "open" : "open");
      },
    });

    return () => {
      disconnect();
      setConnectionState("closed");
    };
  }, [queryClient, submissionId]);

  return {
    connectionState,
    isLive: connectionState === "open",
  };
}
