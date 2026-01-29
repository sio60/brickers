/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8080',
            },
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:8080/api/:path*',
            },
            {
                source: '/auth/:path*',
                destination: 'http://localhost:8080/auth/:path*',
            },
            {
                source: '/uploads/:path*',
                destination: 'http://localhost:8080/uploads/:path*',
            },
        ]
    },
}

module.exports = nextConfig
