// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    domains: ['image.tmdb.org'], // ✅ permite las imágenes externas de TMDB
  },
};

export default nextConfig;