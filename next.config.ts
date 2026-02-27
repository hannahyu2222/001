import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['gray-matter', 'cheerio', 'jsdom', '@mozilla/readability', 'playwright'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'playwright'];
    }
    return config;
  },
};

export default nextConfig;
