import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  // Next injects inline bootstrap; turbopack/dev needs eval. Locks out external script origins.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  // App only talks to its own loopback API; blocks XSS exfiltration to external hosts.
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["playwright", "pdf-parse", "mammoth", "@modelcontextprotocol/sdk"],
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.31.1"],
  outputFileTracingExcludes: {
    "*": [
      "**/dist-electron/**",
      "**/.git/**",
      "**/_inspiration/**",
      "**/docs/**",
      "**/scripts/**",
      "**/*.log",
      "**/test-export.*",
      "**/home.html",
      // Never trace build artifacts into the standalone payload — a release zip
      // sitting in the repo root was getting swept in, doubling the package.
      "**/*.zip",
      "**/*.tsbuildinfo",
      "**/OwnWiki-*.exe",
    ],
    "/api/export/[slug]": [
      "**/*.zip",
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to pages, not file downloads/exports.
        source: "/((?!api/export).*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
