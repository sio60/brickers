import Header from '@/components/Header'

export default function GalleryLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Header />
            <main className="pt-[72px] min-h-screen relative">
                {children}
            </main>
        </>
    )
}
