import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Dev-only build indicator defaults to bottom-left, which sits directly on
  // top of the mobile bottom nav's first tab during local testing at phone
  // viewport widths — this is what actually produced the "Home label reads
  // as 'lome'" screenshot (confirmed via DOM measurement that the label
  // itself renders fully inside the nav pill's bounds; the indicator badge
  // was drawn over the "H"). Every corner of this app's mobile dashboard
  // chrome is already spoken for (title top-left, avatar top-right, FAB
  // bottom-right, nav bottom-left), so there's no free corner to relocate
  // it to — disabling it is dev-only and has no effect on the production
  // build users see.
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.convex.cloud https://*.convex.site https://*.clerk.accounts.dev https://clerk.com wss://*.convex.cloud https://challenges.cloudflare.com",
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
