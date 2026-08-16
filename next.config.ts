import type { NextConfig } from "next";
import path from "node:path";

const framerShim = path.resolve(process.cwd(), "lib/framer-shim.ts");

const nextConfig: NextConfig = {
  // `framer` only exists inside Framer. Both bundlers resolve it to the local
  // shim so the component sources stay paste-ready for Framer's code panel.
  turbopack: {
    resolveAlias: { framer: "./lib/framer-shim.ts" },
  },
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, framer: framerShim };
    return config;
  },
};

export default nextConfig;
