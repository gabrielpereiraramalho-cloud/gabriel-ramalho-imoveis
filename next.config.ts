import type { NextConfig } from "next";

// Host do Supabase (para liberar as imagens públicas no next/image).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Domínio do projeto Supabase informado no ambiente.
      ...(supabaseHost
        ? ([
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ] as const)
        : []),
      // Fallback genérico para projetos hospedados em *.supabase.co.
      {
        protocol: "https" as const,
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Upload de imagens via Server Action: permite arquivos de até ~10 MB.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
