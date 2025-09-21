import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: '.',
  },
  webpack: (config, { isServer }) => {
    // Exclude problematic native modules from MindCraft
    config.externals = config.externals || [];
    config.externals.push({
      'canvas': 'canvas',
      'gl': 'gl',
      '@google/genai': '@google/genai',
      'sharp': 'sharp',
      'node-gyp': 'node-gyp'
    });
    
    // Ignore MindCraft's native dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'canvas': false,
      'gl': false,
      'sharp': false,
      'fs': false,
      'path': false,
      'os': false
    };

    return config;
  },
};

export default nextConfig;
