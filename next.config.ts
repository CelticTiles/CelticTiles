import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Disable React Strict Mode
  reactStrictMode: false,

  // Hide Next.js dev indicator
  devIndicators: false,

  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Turbopack configuration
  turbopack: {
    // Fix workspace root warning
    root: process.cwd(),
  },

  // Experimental optimizations
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  
  // External packages to avoid polyfill conflicts
  serverExternalPackages: ['web-streams-polyfill', 'undici'],

  // Allow cross-origin requests in development
  allowedDevOrigins: [
    'http://192.168.0.6',
    'http://localhost'
  ],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "gtzkxrsbygandkycckhe.supabase.co",
      },
    ],
  },

  // Prevent browser from caching admin pages
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "frame-src 'self' https://www.google.com https://maps.google.com",
      "child-src 'self' https://www.google.com https://maps.google.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "upgrade-insecure-requests",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
    ]
  },
  // Keep tesseract.js out of the Next.js server bundle.
  // It uses web-streams-polyfill which conflicts with Node 20 native streams
  // when bundled. Loading it at runtime via require() in the API route is fine.
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        "tesseract.js",
      ]
    }
    return config
  },
};

export default nextConfig;

