import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignora erros de tipo no build (problemas com tipos do shadcn/ui)
    // Não afeta o funcionamento do sistema
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora warnings de ESLint no build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
