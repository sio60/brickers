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
        // Docker 환경: backend:8080, 로컬 개발: localhost:8080
        const backendUrl = process.env.API_BASE || 'http://localhost:8080';
        return {
            beforeFiles: [],
            afterFiles: [],
            // fallback: 동적 라우트([jobId] 등) 매칭 이후 적용
            // → SSE proxy route handler가 rewrite보다 먼저 매칭됨
            fallback: [
                // AI Server (Chatbot) - Port 8000
                {
                    source: '/api/chat/:path*',
                    destination: `${process.env.AI_API_BASE || 'http://localhost:8000'}/api/chat/:path*`,
                },
                // Spring Boot Backend - Port 8080 (Default)
                {
                    source: '/api/:path*',
                    destination: `${backendUrl}/api/:path*`,
                },
                {
                    source: '/auth/:path*',
                    destination: `${backendUrl}/auth/:path*`,
                },
                {
                    source: '/uploads/:path*',
                    destination: `${backendUrl}/uploads/:path*`,
                },
            ],
        }
    },
}

module.exports = nextConfig
