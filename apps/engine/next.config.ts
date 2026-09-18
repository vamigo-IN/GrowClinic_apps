import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // engine.growclinic.io serves the CRM admin + public ingest API + embed.js.
  async headers() {
    return [
      {
        // embed.js must be cacheable and loadable cross-origin.
        source: '/embed.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
