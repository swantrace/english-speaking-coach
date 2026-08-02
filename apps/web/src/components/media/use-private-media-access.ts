import { mediaAccessResponseSchema } from "@english-coach/contract/media";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

export function privateMediaAccessQueryOptions(assetId: string) {
  return queryOptions({
    queryFn: async () => {
      const response = await apiClient.get(`/api/media/${assetId}/access`);
      return mediaAccessResponseSchema.parse(response.data);
    },
    queryKey: ["media-access", assetId],
    staleTime: 4 * 60 * 1_000,
  });
}

export function usePrivateMediaAccess(assetId: string | null) {
  const options = privateMediaAccessQueryOptions(assetId ?? "");
  return useQuery({
    ...options,
    enabled: Boolean(assetId),
  });
}
