import Link from "next/link";

export default function DiaryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#fafaf9] text-[#2d2d2d] font-sans">
            <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/diary" className="text-xl font-serif font-semibold tracking-tight">
                        My Diary
                    </Link>
                    <Link
                        href="/diary/new"
                        className="px-4 py-2 bg-stone-900 text-white rounded-full text-sm font-medium hover:bg-stone-800 transition-colors"
                    >
                        Write
                    </Link>
                </div>
            </nav>
            <main className="max-w-5xl mx-auto px-6 py-12">
                {children}
            </main>
        </div>
    );
}
