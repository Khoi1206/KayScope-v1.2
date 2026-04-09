import bundleAnalyzer from '@next/bundle-analyzer'
import createNextIntlPlugin from 'next-intl/plugin'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Limit resource sources to mitigate XSS (unsafe-inline/eval required by Next.js 14)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https://blockly-demo.appspot.com",
      "frame-ancestors 'self'",
    ].join('; '),
  },
  // Stop MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Strict HTTPS — 1 year + subdomains
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // Restrict access to sensitive browser APIs
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  webpack(config) {
    // Suppress the PackFileCacheStrategy/FileSystemInfo warning emitted by next-intl's
    // extractor/format/index.js (`import(t)` variable dynamic import). This is a
    // webpack infrastructure log, not a module warning, so ignoreWarnings has no effect
    // on it. Raising infrastructureLogging to 'error' is the correct suppression path.
    // The warning is benign — it only affects cache invalidation accuracy for that one
    // extractor code path, not build output or runtime behaviour.
    config.infrastructureLogging = {
      ...(config.infrastructureLogging ?? {}),
      level: 'error',
    }
    return config
  },
}

export default withNextIntl(withBundleAnalyzer(nextConfig))
