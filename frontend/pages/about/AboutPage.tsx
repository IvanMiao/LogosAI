import type { ReactElement } from 'react';
import { Brain, Code, ExternalLink, Info, Layers, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { cn } from '@/utils/class-name';

const STACK_GROUPS = [
  { label: 'Reader', items: ['React', 'Vite', 'TypeScript', 'Tailwind CSS'] },
  { label: 'App & data', items: ['Cloudflare Workers', 'Hono', 'Better Auth', 'D1'] },
  { label: 'AI backend', items: ['FastAPI', 'Pydantic', 'LangChain', 'Gemini'] },
];

function StackBadges(): ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {STACK_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 font-mono text-xs font-bold text-muted-foreground">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="border-2 border-border bg-card text-xs font-bold text-foreground"
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AboutSection({
  icon: Icon,
  iconClassName,
  iconColorClassName,
  title,
  children,
}: {
  icon: LucideIcon;
  iconClassName: string;
  iconColorClassName: string;
  title: string;
  children: ReactElement;
}): ReactElement {
  return (
    <section className="flex items-start gap-4">
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border shadow-[2px_2px_0px_0px_var(--border)]',
        iconClassName,
      )}>
        <Icon className={cn('h-5 w-5', iconColorClassName)} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="mb-2 font-mono text-base font-bold text-foreground">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function AboutPage(): ReactElement {
  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-5xl border-border shadow-[4px_4px_0px_0px_var(--border)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-border bg-secondary shadow-[2px_2px_0px_0px_var(--border)]">
              <Info className="h-5 w-5 text-foreground" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-mono text-xl font-semibold leading-none tracking-tight text-foreground">
                SYSTEM_MANIFEST
              </h1>
              <CardDescription className="mt-0.5 font-mono text-xs">
                DEEP_TEXT_ANALYSIS_ENGINE
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <AboutSection
            icon={Brain}
            iconClassName="bg-primary"
            iconColorClassName="text-primary-foreground"
            title="OPERATIONAL_SCOPE"
          >
            <div className="space-y-3">
              <p className="max-w-[72ch] text-sm leading-6 text-muted-foreground">
                LogosAI is a source-grounded reading workspace for difficult texts. Import a
                text, explain or translate a passage, explore vocabulary, write notes, and run
                a Close Reading of the whole document. Saved work stays connected to its source.
              </p>
              <p className="max-w-[72ch] text-sm leading-6 text-muted-foreground">
                Your Gemini API key is encrypted before storage and decrypted by the app gateway
                only when you make an AI request. Reading sessions sync with your signed-in account
                and are not end-to-end encrypted.
              </p>
            </div>
          </AboutSection>

          <AboutSection
            icon={Layers}
            iconClassName="bg-accent"
            iconColorClassName="text-accent-foreground"
            title="Tech Stack"
          >
            <StackBadges />
          </AboutSection>

          <AboutSection
            icon={Code}
            iconClassName="bg-green-400"
            iconColorClassName="text-black"
            title="Open Source"
          >
            <div>
              <p className="mb-3 max-w-[72ch] text-sm leading-6 text-muted-foreground">
                LogosAI is open source and under active development.
              </p>
              <a
                href="https://github.com/IvanMiao/LogosAI"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-transparent bg-foreground px-4 py-2 text-sm font-bold text-background shadow-[2px_2px_0px_0px_var(--border)] transition-colors hover:bg-foreground/90 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                View source on GitHub
              </a>
            </div>
          </AboutSection>

          <div className="flex items-center justify-between border-t-2 border-border pt-5 font-mono text-xs text-muted-foreground">
            <span>Active development</span>
            <span>© {new Date().getFullYear()} LogosAI</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
