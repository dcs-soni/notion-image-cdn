// =============================================================================
// SDK Types
// =============================================================================

/** Options for constructing an optimized CDN URL */
export interface OptimizeUrlOptions {
  /** Base URL of the CDN service (e.g., "https://notion-cdn.example.com") */
  cdnBaseUrl: string;
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Output format */
  format?: "webp" | "avif" | "png" | "jpeg";
  /** Output quality (1-100) */
  quality?: number;
  /** Fit mode for resizing */
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

/** Configuration for the Notion image plugin */
export interface PluginConfig {
  /** Base URL of the CDN service */
  cdnBaseUrl: string;
  /** Default output format */
  defaultFormat?: "webp" | "avif" | "png" | "jpeg";
  /** Default quality (1-100) */
  defaultQuality?: number;
  /** Default width */
  defaultWidth?: number;
}

/** Props for the NotionImage React component */
export interface NotionImageProps {
  /** Original Notion S3 image URL */
  src: string;
  /** Base URL of the CDN service */
  cdnBaseUrl: string;
  /** Alt text for accessibility */
  alt: string;
  /** Target width */
  width?: number;
  /** Target height */
  height?: number;
  /** Output format */
  format?: "webp" | "avif" | "png" | "jpeg";
  /** Output quality */
  quality?: number;
  /** CSS class name */
  className?: string;
  /** Loading strategy */
  loading?: "lazy" | "eager";
  /** Style object */
  style?: React.CSSProperties;
}
