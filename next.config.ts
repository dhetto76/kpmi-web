import type { NextConfig } from "next";

/**
 * Supabase Storage serves uploaded images, so its hostname has to be allowed
 * for next/image. Derived from the env var rather than hard-coded, so moving
 * to a different Supabase project needs no code change.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
