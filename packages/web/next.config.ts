import type { NextConfig } from 'next'

/**
 * Next.js 16 config for evo-pi web.
 *
 * Why `serverExternalPackages`: @evo-pi/core uses SDK modules (e.g.,
 * @earendil-works/pi-agent-core → quickjs-wasi) that have Node-internal deps
 * (`wasi_snapshot_preview1`, `env`) not bundleable by Turbopack. Treating
 * core as an external package lets Node resolve them at runtime via
 * package.json exports map (compiled dist/).
 *
 * Phase 0 had empty config; Phase 1 PR.C.6 added serverExternalPackages.
 */
const nextConfig: NextConfig = {
  // Treat @evo-pi/core (and its SDK transitive deps with Node-internal
  // requires like 'wasi_snapshot_preview1' and 'env' from quickjs-wasi) as
  // external packages — Node resolves them at runtime instead of bundling.
  serverExternalPackages: [
    '@evo-pi/core',
    '@earendil-works/pi-coding-agent',
    '@earendil-works/pi-agent-core',
  ],
}

export default nextConfig
