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
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
