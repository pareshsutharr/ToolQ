/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "toolq.online" }],
        destination: "https://www.toolq.online/:path*",
        statusCode: 301,
      },
      {
        source: "/:path*",
        has: [
          { type: "host", value: "www.toolq.online" },
          { type: "header", key: "x-forwarded-proto", value: "http" },
        ],
        destination: "https://www.toolq.online/:path*",
        statusCode: 301,
      },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve.alias.canvas = false;
    if (!isServer) {
      // pptxgenjs's ESM build references these Node built-ins defensively
      // (never actually reached in the browser) using the "node:" URI scheme,
      // which webpack treats as an unhandled scheme rather than a normal bare
      // specifier — `resolve.alias`/`resolve.fallback` never even get a
      // chance to run. Strip the "node:" prefix first so it becomes a plain
      // "fs"/"https" specifier, then fall back to an empty module for those.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        os: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
