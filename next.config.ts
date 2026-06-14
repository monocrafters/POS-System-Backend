import type { NextConfig } from "next";

const isElectronBuild = process.env.ELECTRON === "true";

const nextConfig: NextConfig = {
  output: isElectronBuild ? "standalone" : undefined,
  images: {
    unoptimized: true,
  },

  assetPrefix: isElectronBuild ? undefined : undefined,
  trailingSlash: false,
  transpilePackages: [],
};

export default nextConfig;
