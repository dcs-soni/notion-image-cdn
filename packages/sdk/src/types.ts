export interface OptimizeUrlOptions {
  cdnBaseUrl: string;
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'png' | 'jpeg';
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface PluginConfig {
  cdnBaseUrl: string;
  defaultFormat?: 'webp' | 'avif' | 'png' | 'jpeg';
  defaultQuality?: number;
  defaultWidth?: number;
}

export interface NotionImageProps {
  src: string;
  cdnBaseUrl: string;
  alt: string;
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'png' | 'jpeg';
  quality?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  style?: React.CSSProperties;
}
