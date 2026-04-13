import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Languages, BookOpen } from 'lucide-react';

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
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
                <div className="flex flex-col items-center text-center space-y-8 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-primary border-4 border-border flex items-center justify-center shadow-[8px_8px_0px_0px_var(--border)] mb-4 animate-in zoom-in duration-700 delay-200 fill-mode-both">
                        <Brain className="w-14 h-14 sm:w-20 sm:h-20 text-primary-foreground" />
                    </div>

                    <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter uppercase transform -rotate-1 md:-rotate-2">
                        LogosAI
                    </h1>

                    <div className="bg-accent border-4 border-border px-6 py-2 shadow-[4px_4px_0px_0px_var(--border)] transform rotate-1 md:rotate-2">
                        <p className="text-xl sm:text-2xl font-bold uppercase tracking-widest text-accent-foreground">
                            Deep Text Analysis Engine
                        </p>
                    </div>

                    <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mt-8 leading-relaxed font-bold">
                        Paste any complex text, from news articles to academic papers to literary works, and get detailed linguistic breakdowns powered by AI. Built for advanced language learners and deep readers.
                    </p>

                    <button
                        onClick={() => navigate('/app')}
                        className="mt-12 group relative inline-flex items-center justify-center px-10 py-5 sm:px-12 sm:py-6 text-xl sm:text-2xl font-black uppercase tracking-wider text-black bg-secondary border-4 border-border shadow-[8px_8px_0px_0px_var(--border)] hover:bg-primary hover:shadow-[12px_12px_0px_0px_var(--border)] hover:-translate-y-1 active:translate-y-2 active:translate-x-2 active:shadow-none transition-all duration-200"
                    >
                        Start Analysis
                        <Zap className="ml-4 w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-125 transition-transform duration-200 text-black fill-black" />
                    </button>
                </div>

                {/* Features Grid */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 fill-mode-both">

                    <div className="bg-card border-4 border-border p-8 shadow-[6px_6px_0px_0px_var(--border)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_var(--border)] transition-all group">
                        <div className="w-14 h-14 bg-primary border-2 border-border flex items-center justify-center shadow-[4px_4px_0px_0px_var(--border)] mb-6 group-hover:scale-110 transition-transform">
                            <Languages className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <h3 className="text-2xl font-black uppercase mb-4 text-card-foreground">Any Language</h3>
                        <p className="text-muted-foreground font-medium">Automatic language detection and OCR error correction. Paste text in any language and get accurate analysis instantly.</p>
                    </div>

                    <div className="bg-card border-4 border-border p-8 shadow-[6px_6px_0px_0px_var(--border)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_var(--border)] transition-all group">
                        <div className="w-14 h-14 bg-secondary border-2 border-border flex items-center justify-center shadow-[4px_4px_0px_0px_var(--border)] mb-6 group-hover:scale-110 transition-transform">
                            <Brain className="w-8 h-8 text-secondary-foreground text-black" />
                        </div>
                        <h3 className="text-2xl font-black uppercase mb-4 text-card-foreground">Deep Breakdown</h3>
                        <p className="text-muted-foreground font-medium">Get detailed linguistic analysis covering grammar, vocabulary, nuance, and context, tailored for advanced learners tackling real-world texts.</p>
                    </div>

                    <div className="bg-card border-4 border-border p-8 shadow-[6px_6px_0px_0px_var(--border)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_var(--border)] transition-all group">
                        <div className="w-14 h-14 bg-accent border-2 border-border flex items-center justify-center shadow-[4px_4px_0px_0px_var(--border)] mb-6 group-hover:scale-110 transition-transform">
                            <BookOpen className="w-8 h-8 text-accent-foreground text-black" />
                        </div>
                        <h3 className="text-2xl font-black uppercase mb-4 text-card-foreground">Complex Texts</h3>
                        <p className="text-muted-foreground font-medium">Designed for challenging material like philosophical essays, academic papers, and dense news articles, not just textbook exercises.</p>
                    </div>

                </div>
            </div>
        </div>
    );
}
