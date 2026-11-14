import type { NextConfig } from "next";

const pipelineDevelopmentServer =
  process.env.HERU_PIPELINE_DEV_SERVER ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(process.env.NODE_ENV === "development" && {
    async rewrites() {
      return [
        {
          source: "/v1/:path*",
          destination: `${pipelineDevelopmentServer}/v1/:path*`,
        },
      ];
    },
  }),
};

export default nextConfig;
