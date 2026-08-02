import { mediaAccessResponseSchema } from "@english-coach/contract/media";
import { useQuery } from "@tanstack/react-query";
import type { ImgHTMLAttributes } from "react";
import { apiClient } from "@/lib/axios";

interface PrivateMediaImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src"> {
  alt: string;
  assetId: string | null;
  fallbackUrl?: string | null;
}

export function PrivateMediaImage({ alt, assetId, fallbackUrl, ...imageProps }: PrivateMediaImageProps) {
  const accessQuery = useQuery({
    enabled: Boolean(assetId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/media/${assetId}/access`);
      return mediaAccessResponseSchema.parse(response.data);
    },
    queryKey: ["media-access", assetId],
    staleTime: 4 * 60 * 1_000,
  });
  const source = accessQuery.data?.url ?? fallbackUrl;

  if (!source) {
    return null;
  }

  return <img {...imageProps} alt={alt} src={source} />;
}
