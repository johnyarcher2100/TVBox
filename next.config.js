/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  experimental: {
    esmExternals: 'loose'
  },
  ...(process.env.NODE_ENV === 'production' ? {
    // 生產模式設定
    output: 'export',
    distDir: 'out',
    trailingSlash: true,
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: '*' },
          ],
        },
      ]
    }
  } : {})
}

module.exports = nextConfig