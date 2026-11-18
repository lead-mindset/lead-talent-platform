import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Módulo 1 (registro y resume): todo lo demás queda oculto.
    // Para abrir una sección en un módulo siguiente, quítala de esta lista.
    const hidden = [
      "/inicio",
      "/eventos",
      "/eventos/:path*",
      "/personas",
      "/personas/:path*",
      "/recursos",
      "/recursos/:path*",
      "/admin",
      "/admin/:path*",
      "/empresa",
      "/empresa/:path*",
      "/board",
      "/board/:path*",
      "/login/:path+",
      "/design-system",
    ];
    return [
      ...hidden.map((source) => ({ source, destination: "/perfil", permanent: false })),
    ];
  },
};

export default nextConfig;
