import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean, self-contained production build for the Docker image (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
