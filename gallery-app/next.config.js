/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // basePath handles the path prefix /gallery
    basePath: '/gallery',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
}

module.exports = nextConfig
