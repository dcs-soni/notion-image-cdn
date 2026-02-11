// =============================================================================
// Configuration — Zod-Validated Environment Config
// =============================================================================
// All configuration is loaded once at startup, validated, and frozen.
// No `process.env` access should happen anywhere else in the codebase.
// =============================================================================

import { z } from "zod";

const ConfigSchema = z.object({
  // ---- Server ----
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // ---- Storage Backend ----
  STORAGE_BACKEND: z.enum(["fs", "s3", "r2"]).default("fs"),
  CACHE_DIR: z.string().default("./cache"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // ---- Edge Cache (L2) ----
  REDIS_URL: z.string().optional(),

  // ---- Security ----
  ALLOWED_DOMAINS: z
    .string()
    .default(
      "prod-files-secure.s3.us-west-2.amazonaws.com,s3.us-west-2.amazonaws.com,images.unsplash.com",
    ),
  MAX_IMAGE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .default(25 * 1024 * 1024), // 25MB
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15_000),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(100),

  // ---- API Keys ----
  API_KEYS_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  HMAC_SECRET: z.string().min(32).optional(),

  // ---- CORS ----
  CORS_ORIGINS: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/** Parsed allowed domains as a Set for O(1) lookups */
export interface ResolvedConfig extends Config {
  allowedDomainsSet: Set<string>;
  corsOrigins: string[];
}

/**
 * Load and validate configuration from environment variables.
 * Fails fast at startup if config is invalid.
 */
export function loadConfig(): ResolvedConfig {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    // Using console.error here intentionally — logger isn't initialized yet
    console.error(`\n❌ Invalid configuration:\n${formatted}\n`);
    process.exit(1);
  }

  const config = result.data;

  // Parse comma-separated domains into a Set for O(1) lookups
  const allowedDomainsSet = new Set(
    config.ALLOWED_DOMAINS.split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  );

  // Parse CORS origins
  const corsOrigins = config.CORS_ORIGINS
    ? config.CORS_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : ["*"];

  // Validate S3 config if S3/R2 backend is selected
  if (config.STORAGE_BACKEND === "s3" || config.STORAGE_BACKEND === "r2") {
    if (!config.S3_BUCKET) {
      console.error(
        "❌ S3_BUCKET is required when STORAGE_BACKEND is s3 or r2",
      );
      process.exit(1);
    }
    if (!config.S3_ACCESS_KEY || !config.S3_SECRET_KEY) {
      console.error(
        "❌ S3_ACCESS_KEY and S3_SECRET_KEY are required when STORAGE_BACKEND is s3 or r2",
      );
      process.exit(1);
    }
  }

  return Object.freeze({
    ...config,
    allowedDomainsSet,
    corsOrigins,
  }) as ResolvedConfig;
}
