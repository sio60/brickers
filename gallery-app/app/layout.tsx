import type { Metadata } from 'next'
import { Bebas_Neue, Nanum_Gothic, M_PLUS_Rounded_1c } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { LanguageProvider } from '../contexts/LanguageContext'
import { AuthProvider } from '../contexts/AuthContext'
import LayoutContent from '../components/layout/LayoutContent'
import GoogleAnalytics from '../components/layout/GoogleAnalytics'

const GA_TRACKING_ID = process.env['NEXT_PUBLIC_GA_ID'] || ''
const GTM_ID = process.env['NEXT_PUBLIC_GTM_ID'] || ''

const bebasNeue = Bebas_Neue({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-bebas'
})

const nanumGothic = Nanum_Gothic({
    weight: ['400', '700', '800'],
    subsets: ['latin'],
    variable: '--font-nanum',
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
        default: 'BRICKERS | AI BRICK Generator',
        template: '%s | BRICKERS'
    },
    description: 'Transform your ideas into BRICK models with AI',
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
        <html lang="en" className={`${bebasNeue.variable} ${nanumGothic.variable} ${mPlusRounded.variable}`} suppressHydrationWarning>
            <head>
                {/* 한국어 폰트: Chiron GoRound TC */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Chiron+GoRound+TC:wght@400;500;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                {GTM_ID && (
                    <noscript>
                        <iframe
                            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                            height="0"
                            width="0"
                            style={{ display: 'none', visibility: 'hidden' }}
                        />
                    </noscript>
                )}
                <LanguageProvider>
                    <AuthProvider>
                        <GoogleAnalytics />
                        <LayoutContent>
                            {children}
                        </LayoutContent>
                    </AuthProvider>
                </LanguageProvider>
                {GA_TRACKING_ID && (
                    <>
                        <Script
                            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
                            strategy="afterInteractive"
                        />
                        <Script id="google-analytics" strategy="afterInteractive">
                            {`
                                window.dataLayer = window.dataLayer || [];
                                window.gtag = function(){window.dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${GA_TRACKING_ID}', {
                                    page_path: window.location.pathname,
                                    debug_mode: true,
                                });
                            `}
                        </Script>
                    </>
                )}
                {GTM_ID && (
                    <Script id="google-tag-manager" strategy="afterInteractive">
                        {`
                            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                            })(window,document,'script','dataLayer','${GTM_ID}');
                        `}
                    </Script>
                )}
                <Script id="next-chunk-recovery" strategy="afterInteractive">
                    {`
                        (function () {
                            var KEY = 'brickers:chunk-reload-ts';
                            var WINDOW_MS = 30000;

                            function canReload() {
                                try {
                                    var last = Number(sessionStorage.getItem(KEY) || '0');
                                    return !last || (Date.now() - last) > WINDOW_MS;
                                } catch (_) {
                                    return true;
                                }
                            }

                            function markReload() {
                                try {
                                    sessionStorage.setItem(KEY, String(Date.now()));
                                } catch (_) {}
                            }

                            function looksLikeNextAssetUrl(url) {
                                return typeof url === 'string' && url.indexOf('/_next/static/') !== -1;
                            }

                            function recover(reason) {
                                if (!canReload()) return;
                                console.warn('[ChunkRecovery] reloading page due to stale Next asset:', reason);
                                markReload();
                                window.location.reload();
                            }

                            window.addEventListener('error', function (event) {
                                var target = event && event.target;
                                if (!target || target === window) return;
                                var tag = target.tagName || '';
                                var url = target.src || target.href || '';
                                if ((tag === 'SCRIPT' || tag === 'LINK') && looksLikeNextAssetUrl(url)) {
                                    recover(url);
                                }
                            }, true);

                            window.addEventListener('unhandledrejection', function (event) {
                                var reason = event && event.reason;
                                var msg = String((reason && (reason.message || reason.stack)) || reason || '');
                                if (/ChunkLoadError|Loading chunk [0-9]+ failed|Failed to fetch dynamically imported module/i.test(msg)) {
                                    recover(msg);
                                }
                            });
                        })();
                    `}
                </Script>
                {/* Google Pay */}
                <Script src="https://pay.google.com/gp/p/js/pay.js" strategy="afterInteractive" />
            </body>
        </html>
    )
}
