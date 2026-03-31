import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry (core SDK - no React dependency)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    outDir: 'dist',
    splitting: false,
  },
  // React entry (optional peer dep)
  {
    entry: ['src/react.tsx'],
    format: ['cjs', 'esm'],
    dts: true,
    outDir: 'dist',
    splitting: false,
    external: ['react'],
    esbuildOptions(options) {
      options.jsx = 'automatic';
    },
  },
]);
