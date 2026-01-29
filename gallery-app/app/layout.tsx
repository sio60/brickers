import type { Metadata } from 'next'
import { Bebas_Neue, Jua, M_PLUS_Rounded_1c } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '../contexts/LanguageContext'
import { AuthProvider } from '../contexts/AuthContext'
import LayoutContent from '../components/LayoutContent'

const bebasNeue = Bebas_Neue({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-bebas'
})

const jua = Jua({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-jua'
})

const mPlusRounded = M_PLUS_Rounded_1c({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-m-plus'
})

export const metadata: Metadata = {
    title: {
        default: 'BRICKERS | AI LEGO Generator',
        template: '%s | BRICKERS'
    },
    description: 'Transform your ideas into LEGO models with AI',
    other: {
        'preconnect': 'https://fonts.googleapis.com',
        'preconnect-link': 'https://fonts.gstatic.com',
    }
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${bebasNeue.variable} ${jua.variable} ${mPlusRounded.variable}`}>
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Chiron+GoRound+TC:wght@400;500;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <LanguageProvider>
                    <AuthProvider>
                        <LayoutContent>
                            {children}
                        </LayoutContent>
                    </AuthProvider>
                </LanguageProvider>
            </body>
        </html>
    )
}
