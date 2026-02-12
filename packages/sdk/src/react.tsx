// =============================================================================
// NotionImage React Component
// =============================================================================
// Drop-in replacement for <img> that automatically rewrites Notion S3 URLs
// to permanent CDN URLs.
// =============================================================================

import React from 'react';
import { getOptimizedUrl } from './url-rewriter';
import type { NotionImageProps } from './types';

/**
 * React component that renders an `<img>` with the Notion image URL
 * rewritten to the CDN URL.
 *
 * @example
 * ```tsx
 * <NotionImage
 *   src="https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-..."
 *   cdnBaseUrl="https://notion-cdn.example.com"
 *   width={800}
 *   format="webp"
 *   alt="My blog image"
 *   className="rounded-lg shadow-md"
 * />
 * ```
 */
export const NotionImage: React.FC<NotionImageProps> = ({
  src,
  cdnBaseUrl,
  alt,
  width,
  height,
  format,
  quality,
  className,
  loading = 'lazy',
  style,
}) => {
  const optimizedSrc = getOptimizedUrl(src, {
    cdnBaseUrl,
    width,
    height,
    format,
    quality,
  });

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      style={style}
      decoding="async"
    />
  );
};

NotionImage.displayName = 'NotionImage';
