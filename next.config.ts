import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["lightningcss"],
  images: {
    remotePatterns: [
      {
        // MinIO self-hosted — replace with your actual MinIO domain
        protocol: "https",
        hostname: process.env.MINIO_HOSTNAME || "storage.yourdomain.com",
        pathname: "/**",
      },
      {
        // Supabase — kept temporarily for backward-compat with old image URLs in DB
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
