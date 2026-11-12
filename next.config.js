/** @type {import('next').NextConfig} */

// Response headers for every route.
// - Framing is forbidden (clickjacking on the Add / Decline buttons).
// - form-action allows GitHub because NextAuth's sign-in form redirects there.
// - A full script-src policy is not set: Next.js injects inline scripts, which would require nonces.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://github.com",
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig = {
  // A lockfile exists in a parent directory; pin tracing to this project.
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  // The Open Graph image routes read these fonts at runtime; make sure deployments include them.
  outputFileTracingIncludes: { '/**': ['./node_modules/@fontsource/mona-sans/files/mona-sans-latin-*-normal.woff'] },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
