import type { ImgHTMLAttributes } from "react";
import { usePrivateMediaAccess } from "./use-private-media-access";

interface PrivateMediaImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src"> {
  alt: string;
  assetId: string | null;
  fallbackUrl?: string | null;
}

export function PrivateMediaImage({ alt, assetId, fallbackUrl, ...imageProps }: PrivateMediaImageProps) {
  const accessQuery = usePrivateMediaAccess(assetId);
  const source = accessQuery.data?.url ?? fallbackUrl;

  if (!source) {
    return null;
  }

  return <img {...imageProps} alt={alt} src={source} />;
}
