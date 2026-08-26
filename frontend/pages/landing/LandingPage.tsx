import type { ReactElement } from 'react';
import { BookOpen, Brain, Cloud, Languages, Zap, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '@/components/SiteFooter';
import { useAuth } from '@/features/auth';
import { cn } from '@/utils/class-name';

interface LandingFeature {
  title: string;
  description: string;
  icon: LucideIcon;
  iconSurface: string;
}

const LANDING_FEATURES: LandingFeature[] = [
  {
    title: 'Any language',
    description: 'Read challenging material in its original language, with explanations and translation kept beside the source.',
    icon: Languages,
    iconSurface: 'bg-primary text-primary-foreground',
  },
  {
    title: 'Source-linked help',
    description: 'Select a difficult passage for an explanation, vocabulary help, a note, or a deeper close reading.',
    icon: BookOpen,
    iconSurface: 'bg-secondary text-black',
  },
  {
    title: 'Cloud sessions',
    description: 'Return to each text with its saved selections, notes, and reading entries still attached.',
    icon: Cloud,
    iconSurface: 'bg-accent text-black',
  },
];

function FeatureCard({ feature }: { feature: LandingFeature }): ReactElement {
  const Icon = feature.icon;
  return (
    <article className="border-4 border-border bg-card p-8 shadow-[6px_6px_0px_0px_var(--border)]">
      <div className={cn(
        'mb-6 flex h-14 w-14 items-center justify-center border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]',
        feature.iconSurface,
      )}>
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="mb-4 font-brand text-2xl font-black uppercase text-card-foreground">
        {feature.title}
      </h2>
      <p className="text-pretty font-mono font-medium leading-relaxed text-muted-foreground">
        {feature.description}
      </p>
    </article>
  );
}

function LandingHero({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}): ReactElement {
  return (
    <section className="mb-20 flex flex-col items-center space-y-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-300">
      <div className="mb-4 flex h-24 w-24 items-center justify-center border-4 border-border bg-primary shadow-[8px_8px_0px_0px_var(--border)] motion-safe:animate-in motion-safe:zoom-in motion-safe:delay-100 motion-safe:duration-300 motion-safe:fill-mode-both sm:h-32 sm:w-32">
        <Brain className="h-14 w-14 text-primary-foreground sm:h-20 sm:w-20" aria-hidden="true" />
      </div>

      <h1 className="-rotate-1 font-brand text-6xl font-black uppercase tracking-tighter sm:text-8xl md:-rotate-2 md:text-9xl">
        LogosAI
      </h1>

      <div className="mx-2 max-w-[calc(100vw-3rem)] rotate-1 border-4 border-border bg-accent px-3 py-2 shadow-[4px_4px_0px_0px_var(--border)] sm:px-6 md:rotate-2">
        <p className="text-balance font-brand text-sm font-bold uppercase tracking-[0.12em] text-accent-foreground sm:text-2xl sm:tracking-widest">
          Source-grounded reading workspace
        </p>
      </div>

      <p className="mt-8 max-w-2xl text-pretty px-1 font-mono text-base font-medium leading-relaxed text-muted-foreground sm:text-xl">
        Import a difficult text, understand the passages that slow you down, and keep every useful note or close read tied to its source.
      </p>

      <Link
        to={isAuthenticated ? '/app' : '/register'}
        className="relative mt-12 inline-flex max-w-full items-center justify-center border-4 border-border bg-secondary px-6 py-5 font-brand text-lg font-black uppercase tracking-wide text-black shadow-[8px_8px_0px_0px_var(--border)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:bg-primary hover:shadow-[12px_12px_0px_0px_var(--border)] active:translate-x-2 active:translate-y-2 active:shadow-none motion-reduce:transition-none sm:px-12 sm:py-6 sm:text-2xl sm:tracking-wider"
      >
        {isAuthenticated ? 'Continue reading' : 'Start reading'}
        <Zap className="ml-4 h-7 w-7 fill-black text-black sm:h-8 sm:w-8" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function LandingPage(): ReactElement {
  const auth = useAuth();
  const isAuthenticated = auth.status === 'authenticated';

  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-x-hidden bg-background p-6 font-mono text-foreground sm:p-12">
      <nav aria-label="Account" className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
        <Link
          to={isAuthenticated ? '/app' : '/login'}
          className="inline-flex min-h-11 items-center border-2 border-border bg-card px-4 text-sm font-black shadow-hard-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transition-none"
        >
          {isAuthenticated ? 'Open workspace' : 'Sign in'}
        </Link>
      </nav>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, var(--foreground) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <main
        id="main-content"
        data-route-focus
        tabIndex={-1}
        className="z-10 flex w-full max-w-5xl flex-1 flex-col items-center justify-center"
      >
        <LandingHero isAuthenticated={isAuthenticated} />
        <section
          aria-label="What LogosAI keeps together"
          className="mt-12 grid w-full grid-cols-1 gap-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-12 motion-safe:delay-150 motion-safe:duration-300 motion-safe:fill-mode-both md:grid-cols-3"
        >
          {LANDING_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </section>
      </main>
      <div className="z-10 w-full max-w-5xl">
        <SiteFooter source="landing" />
      </div>
    </div>
  );
}
