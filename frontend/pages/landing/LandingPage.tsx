import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Languages, BookOpen } from 'lucide-react';

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <main
            data-route-focus
            tabIndex={-1}
            className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6 font-mono text-foreground sm:p-12"
        >
            {/* Background decoration */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, var(--foreground) 1px, transparent 0)',
                    backgroundSize: '32px 32px'
                }}
            ></div>

            <div className="max-w-5xl w-full z-10 flex flex-col items-center">
                {/* Hero Section */}
                <div className="mb-20 flex flex-col items-center space-y-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-1000">
                    <div className="mb-4 flex h-24 w-24 items-center justify-center border-4 border-border bg-primary shadow-[8px_8px_0px_0px_var(--border)] motion-safe:animate-in motion-safe:zoom-in motion-safe:delay-200 motion-safe:duration-700 motion-safe:fill-mode-both sm:h-32 sm:w-32">
                        <Brain className="w-14 h-14 sm:w-20 sm:h-20 text-primary-foreground" />
                    </div>

                    <h1 className="font-brand text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter uppercase transform -rotate-1 md:-rotate-2">
                        LogosAI
                    </h1>

                    <div className="bg-accent border-4 border-border px-6 py-2 shadow-[4px_4px_0px_0px_var(--border)] transform rotate-1 md:rotate-2">
                        <p className="font-brand text-xl sm:text-2xl font-bold uppercase tracking-widest text-accent-foreground">
                            Deep Text Analysis Engine
                        </p>
                    </div>

                    <p className="mt-8 max-w-2xl text-pretty font-mono text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
                        Paste any complex text, from news articles to academic papers to literary works, and get detailed linguistic breakdowns powered by AI. Built for advanced language learners and deep readers.
                    </p>

                    <button
                        onClick={() => navigate('/app')}
                        className="relative mt-12 inline-flex items-center justify-center border-4 border-border bg-secondary px-10 py-5 font-brand text-xl font-black uppercase tracking-wider text-black shadow-[8px_8px_0px_0px_var(--border)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:bg-primary hover:shadow-[12px_12px_0px_0px_var(--border)] active:translate-x-2 active:translate-y-2 active:shadow-none motion-reduce:transition-none sm:px-12 sm:py-6 sm:text-2xl"
                    >
                        Start Analysis
                        <Zap className="ml-4 h-7 w-7 fill-black text-black sm:h-8 sm:w-8" />
                    </button>
                </div>

                {/* Features Grid */}
                <div className="mt-12 grid w-full grid-cols-1 gap-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-12 motion-safe:delay-500 motion-safe:duration-1000 motion-safe:fill-mode-both md:grid-cols-3">

                    <div className="border-4 border-border bg-card p-8 shadow-[6px_6px_0px_0px_var(--border)]">
                        <div className="mb-6 flex h-14 w-14 items-center justify-center border-2 border-border bg-primary shadow-[4px_4px_0px_0px_var(--border)]">
                            <Languages className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <h2 className="mb-4 font-brand text-2xl font-black uppercase text-card-foreground">Any Language</h2>
                        <p className="text-pretty font-mono font-medium leading-relaxed text-muted-foreground">Automatic language detection and OCR error correction. Paste text in any language and get accurate analysis instantly.</p>
                    </div>

                    <div className="border-4 border-border bg-card p-8 shadow-[6px_6px_0px_0px_var(--border)]">
                        <div className="mb-6 flex h-14 w-14 items-center justify-center border-2 border-border bg-secondary shadow-[4px_4px_0px_0px_var(--border)]">
                            <Brain className="w-8 h-8 text-secondary-foreground text-black" />
                        </div>
                        <h2 className="mb-4 font-brand text-2xl font-black uppercase text-card-foreground">Deep Breakdown</h2>
                        <p className="text-pretty font-mono font-medium leading-relaxed text-muted-foreground">Get detailed linguistic analysis covering grammar, vocabulary, nuance, and context, tailored for advanced learners tackling real-world texts.</p>
                    </div>

                    <div className="border-4 border-border bg-card p-8 shadow-[6px_6px_0px_0px_var(--border)]">
                        <div className="mb-6 flex h-14 w-14 items-center justify-center border-2 border-border bg-accent shadow-[4px_4px_0px_0px_var(--border)]">
                            <BookOpen className="w-8 h-8 text-accent-foreground text-black" />
                        </div>
                        <h2 className="mb-4 font-brand text-2xl font-black uppercase text-card-foreground">Complex Texts</h2>
                        <p className="text-pretty font-mono font-medium leading-relaxed text-muted-foreground">Designed for challenging material like philosophical essays, academic papers, and dense news articles, not just textbook exercises.</p>
                    </div>

                </div>
            </div>
        </main>
    );
}
