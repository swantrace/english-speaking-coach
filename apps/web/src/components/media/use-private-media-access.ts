import { mediaAccessResponseSchema } from "@english-coach/contract/media";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

export function usePrivateMediaAccess(assetId: string | null) {
  return useQuery({
    enabled: Boolean(assetId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/media/${assetId}/access`);
      return mediaAccessResponseSchema.parse(response.data);
    },
    queryKey: ["media-access", assetId],
    staleTime: 4 * 60 * 1_000,
  });
}
