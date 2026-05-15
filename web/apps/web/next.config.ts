import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@lumina/core', '@lumina/ui'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default config;
