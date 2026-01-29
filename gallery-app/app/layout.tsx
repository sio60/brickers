import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '../contexts/LanguageContext'
import { AuthProvider } from '../contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: {
        default: 'Brickers - AI 레고 작품 생성',
        template: '%s | Brickers',
    },
    description: 'AI로 나만의 레고 작품을 쉽게 만들어보세요. Create your own LEGO creations with AI.',
    metadataBase: new URL('https://brickers.shop'),
    alternates: {
        canonical: '/',
    },
    openGraph: {
        siteName: 'Brickers',
        type: 'website',
        locale: 'ko_KR',
        url: 'https://brickers.shop',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Brickers - AI 레고 작품 생성',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Brickers - AI 레고 작품 생성',
        description: 'AI로 나만의 레고 작품을 쉽게 만들어보세요.',
        images: ['/og-image.png'],
    },
    keywords: ['레고', 'LEGO', 'AI', '브릭', '갤러리', '3D', '조립', 'Brickers', '키즈'],
    authors: [{ name: 'Brickers' }],
    creator: 'Brickers',
    publisher: 'Brickers',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ko">
            <body className={inter.className}>
                <LanguageProvider>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </LanguageProvider>
            </body>
        </html>
    )
}
