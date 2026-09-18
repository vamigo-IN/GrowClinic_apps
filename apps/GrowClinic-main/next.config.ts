import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ── Legacy WordPress URLs → new pages ──────────────────────────────
      // Preserve the SEO equity carried over from the old WordPress site
      // (per Search Console, these old URLs still hold rankings/impressions).
      {
        // 94% of historical impressions lived on this one URL.
        source: "/digital-marketing-for-clinics-get-more-patients-online",
        destination: "/digital-marketing-for-clinics",
        permanent: true,
      },
      { source: "/home", destination: "/", permanent: true },
      { source: "/our-projects", destination: "/projects", permanent: true },
      {
        source: "/how-to-measure-seo-success-key-metrics-to-track",
        destination: "/blog",
        permanent: true,
      },
      // Old blog taxonomy — specific high-ranking category first, then catch-all.
      { source: "/category/dentist-marketing", destination: "/specialties/dental", permanent: true },
      { source: "/category/:slug*", destination: "/blog", permanent: true },
      { source: "/tag/:slug*", destination: "/blog", permanent: true },
      // Old demo team profiles from the WP theme (placeholder names) → About.
      { source: "/teams/:slug*", destination: "/about", permanent: true },
      { source: "/team/:slug*", destination: "/about", permanent: true },
    ];
  },
  images: {
    // Serve smaller modern formats + cache optimized images longer (helps LCP).
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        // ImageKit CDN — blog uploads (featured images render via next/image).
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      }
    ],
  },
  // ── Turbopack config ────────────────────────────────────────────────────
  // Next.js 16 uses Turbopack by default. Setting an empty config silences
  // the warning and lets Turbopack handle chunking automatically (it already
  // bundles vendor libraries more efficiently than webpack defaults).
  turbopack: {},
  // ── Webpack fallback (used by `next build --webpack`) ──────────────────
  // Merge heavy vendor libraries and shared modules into fewer JS files so
  // the browser makes fewer /_next/static/chunks/ requests on first load.
  webpack(config, { isServer }) {
    if (!isServer) {
      const cacheGroups = config.optimization?.splitChunks?.cacheGroups ?? {};
      Object.assign(cacheGroups, {
        framerMotion: {
          test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
          name: 'vendor-framer-motion',
          chunks: 'all' as const,
          priority: 30,
        },
        lucide: {
          test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
          name: 'vendor-lucide',
          chunks: 'all' as const,
          priority: 30,
        },
        commons: {
          name: 'commons',
          minChunks: 2,
          chunks: 'all' as const,
          priority: 10,
          reuseExistingChunk: true,
        },
      });
      if (config.optimization?.splitChunks) {
        config.optimization.splitChunks.cacheGroups = cacheGroups;
      }
    }
    return config;
  },
};

export default nextConfig;
