import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAdminSubmissionJobDetail, fetchAdminSubmissionJobs } from "./api";
import type { AdminJobListFilters } from "./types";

export function useAdminSubmissionJobsQuery(submissionId: string, filters: AdminJobListFilters = {}) {
  return useQuery({
    enabled: Boolean(submissionId),
    queryFn: () => fetchAdminSubmissionJobs(submissionId, filters),
    queryKey: queryKeys.admin.submissions.jobs.list(submissionId, filters),
    staleTime: 10_000,
  });
}

export function useAdminSubmissionJobDetailQuery(submissionId: string, jobId: string) {
  return useQuery({
    enabled: Boolean(jobId && submissionId),
    queryFn: () => fetchAdminSubmissionJobDetail(submissionId, jobId),
    queryKey: queryKeys.admin.submissions.jobs.detail(submissionId, jobId),
    staleTime: 10_000,
  });
}
