import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@lumina/core', '@lumina/drive', '@lumina/ui'],
};

export default config;
