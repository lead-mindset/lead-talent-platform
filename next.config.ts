import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/board", destination: "/admin/junta", permanent: false },
      { source: "/board/:path*", destination: "/admin/junta", permanent: false },
    ];
  },
};

export default nextConfig;
