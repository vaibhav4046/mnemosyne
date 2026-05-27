import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;
