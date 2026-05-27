import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "pdf-parse", "mammoth", "@modelcontextprotocol/sdk"],
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.31.1"],
};

export default nextConfig;
