import type { NextConfig } from "next";

/**
 * Optional same-origin mode. When API_PROXY_TARGET is set (e.g. https://api.example.com),
 * the browser talks to /api on this origin and Next forwards the request untouched, so the
 * session cookie becomes first-party. This is a pure rewrite: no business logic lives here.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
