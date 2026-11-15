import type { NextConfig } from "next";

const development = process.env.NODE_ENV === "development";
const pipelineDevelopmentServer =
  process.env.HERU_PIPELINE_DEV_SERVER ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(development
    ? {
        async rewrites() {
          return [
            {
              source: "/v1/:path*",
              destination: `${pipelineDevelopmentServer}/v1/:path*`,
            },
          ];
        },
      }
    : { output: "export" as const }),
};

export default nextConfig;
