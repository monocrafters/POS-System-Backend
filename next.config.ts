import type { NextConfig } from "next";

const isElectronBuild = process.env.ELECTRON === "true" && !process.env.VERCEL;

const nextConfig: NextConfig = {
  output: isElectronBuild ? "standalone" : undefined,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "mongoose", "better-sqlite3"],
  images: {
    unoptimized: true,
  },

  assetPrefix: isElectronBuild ? undefined : undefined,
  trailingSlash: false,
  transpilePackages: [],
};

export default nextConfig;
