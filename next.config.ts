import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    // The prototype used #/firms and #/gps for the same directory.
    return [{ source: '/firms', destination: '/gps', permanent: false }];
  },
};

export default nextConfig;
