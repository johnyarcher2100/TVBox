/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  ...(process.env.NODE_ENV === 'development' ? {
    // 開發模式設定
    experimental: {
      esmExternals: 'loose'
    }
  } : {
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
    },
    experimental: {
      esmExternals: 'loose'
    }
  })
}

module.exports = nextConfig