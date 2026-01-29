import Header from '@/components/Header'
import BackgroundBricks from '@/components/BackgroundBricks'

export default function GalleryLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <BackgroundBricks />
            <Header />
            <main className="pt-[72px] min-h-screen relative">
                {children}
            </main>
        </>
    )
}
