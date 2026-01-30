import type { Metadata } from 'next'
import { Bebas_Neue, Jua, M_PLUS_Rounded_1c } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { LanguageProvider } from '../contexts/LanguageContext'
import { AuthProvider } from '../contexts/AuthContext'
import LayoutContent from '../components/LayoutContent'
import GoogleAnalytics from '../components/GoogleAnalytics'

const GA_TRACKING_ID = 'G-GHSB43V8CL'
const GTM_ID = 'GTM-M9ND3LMV'

const bebasNeue = Bebas_Neue({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-bebas'
})

const jua = Jua({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-jua',
    preload: true,
    display: 'swap'
})

const mPlusRounded = M_PLUS_Rounded_1c({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-m-plus',
    preload: false,
    display: 'swap'
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
        <html lang="en" className={`${bebasNeue.variable} ${jua.variable} ${mPlusRounded.variable}`} suppressHydrationWarning>
            <head>
                {/* Jua 한글 폰트 전체 로드 */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Jua&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <noscript>
                    <iframe
                        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                        height="0"
                        width="0"
                        style={{ display: 'none', visibility: 'hidden' }}
                    />
                </noscript>
                <LanguageProvider>
                    <AuthProvider>
                        <GoogleAnalytics />
                        <LayoutContent>
                            {children}
                        </LayoutContent>
                    </AuthProvider>
                </LanguageProvider>
                <Script
                    src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${GA_TRACKING_ID}', {
                            page_path: window.location.pathname,
                        });
                    `}
                </Script>
                <Script id="google-tag-manager" strategy="afterInteractive">
                    {`
                        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                        })(window,document,'script','dataLayer','${GTM_ID}');
                    `}
                </Script>
            </body>
        </html>
    )
}
