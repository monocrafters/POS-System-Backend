import type { NextConfig } from "next";

const isElectronBuild = process.env.ELECTRON === "true";

const nextConfig: NextConfig = {
  output: isElectronBuild ? "standalone" : undefined,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "pg", "better-sqlite3"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: Object.entries({
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, Accept, Origin, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers",
          "Access-Control-Expose-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        }).map(([key, value]) => ({ key, value })),
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./prisma/schema.prisma",
      "./prisma/prisma/pos.db",
      "./prisma/pos.db",
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
    ],
  },
  images: {
    unoptimized: true,
  },

  assetPrefix: isElectronBuild ? undefined : undefined,
  trailingSlash: false,
  transpilePackages: [],
};

export default nextConfig;
