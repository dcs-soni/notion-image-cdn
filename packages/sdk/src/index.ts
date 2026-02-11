// =============================================================================
// SDK Main Export
// =============================================================================

export { getOptimizedUrl, isNotionImageUrl } from './url-rewriter';
export type { OptimizeUrlOptions, PluginConfig, NotionImageProps } from './types';

import { getOptimizedUrl } from './url-rewriter';
import type { PluginConfig } from './types';

/**
 * Create a pre-configured URL rewriter function for use in markdown renderers
 * or template systems.
 *
 * @example
 * ```tsx
 * const rewriteNotionImages = createNotionImagePlugin({
 *   cdnBaseUrl: 'https://notion-cdn.example.com',
 *   defaultFormat: 'webp',
 *   defaultQuality: 85,
 * });
 *
 * // In your markdown components:
 * const components = {
 *   img: ({ src, alt }) => {
 *     const optimizedSrc = rewriteNotionImages(src);
 *     return <img src={optimizedSrc} alt={alt} loading="lazy" />;
 *   },
 * };
 * ```
 */
export function createNotionImagePlugin(config: PluginConfig): (src: string) => string {
  return (src: string) =>
    getOptimizedUrl(src, {
      cdnBaseUrl: config.cdnBaseUrl,
      format: config.defaultFormat,
      quality: config.defaultQuality,
      width: config.defaultWidth,
    });
}
