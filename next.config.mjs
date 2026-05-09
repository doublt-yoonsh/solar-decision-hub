/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer ships ESM-only — Next.js must transpile it for the
  // client bundle. Without this, dynamic import fails at build time.
  transpilePackages: ["@react-pdf/renderer"],
  experimental: {
    // Tree-shake heavy chart / icon barrels so we only ship what's used.
    optimizePackageImports: ["recharts", "lucide-react"],
  },
  images: {
    // No remote images in v1. Add domains here when integrating real APIs.
    remotePatterns: [],
  },
};

export default nextConfig;
