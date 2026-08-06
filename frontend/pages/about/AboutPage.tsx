import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Brain, Code, Layers, ExternalLink } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-5xl border-border shadow-[4px_4px_0px_0px_var(--border)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-secondary border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
              <Info className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="font-mono text-xl font-semibold leading-none tracking-tight text-foreground">SYSTEM_MANIFEST</h1>
              <CardDescription className="mt-0.5 font-mono text-xs">
                DEEP_TEXT_ANALYSIS_ENGINE
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary border-2 border-border flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_var(--border)]">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="mb-2 font-mono text-base font-bold text-foreground">OPERATIONAL_SCOPE</h2>
                <p className="max-w-[70ch] font-sans text-sm leading-relaxed text-muted-foreground">
                  Executes deep linguistic deconstruction. Isolates syntactic structures, decodes rhetorical strategies, and maps logical hierarchies. Extracts idiomatic nuances, cultural context, and authorial intent. Delivers rigorous, genre-specific analysis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-accent border-2 border-border flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_var(--border)]">
                <Layers className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="mb-3 font-mono text-base font-bold text-foreground">Tech Stack</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 font-mono">Frontend</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-2 border-border bg-card text-xs font-bold text-foreground">React</Badge>
                      <Badge variant="outline" className="border-2 border-border bg-card text-xs font-bold text-foreground">Vite</Badge>
                      <Badge variant="outline" className="border-2 border-border bg-card text-xs font-bold text-foreground">TailwindCSS</Badge>
                      <Badge variant="outline" className="border-2 border-border bg-card text-xs font-bold text-foreground">shadcn/ui</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 font-mono">Backend</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-2 border-border bg-card text-xs font-bold text-foreground">Langchain</Badge>
                      <Badge variant="outline" className="border-2 border-border bg-card text-xs font-bold text-foreground">FastAPI</Badge>
                      <Badge variant="outline" className="border-2 border-border bg-card text-xs font-bold text-foreground">PostgreSQL</Badge>
                      <Badge variant="outline" className="border-2 border-border bg-card text-xs font-bold text-foreground">Pydantic</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-400 border-2 border-border flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_var(--border)]">
                <Code className="w-5 h-5 text-black" />
              </div>
              <div className="min-w-0">
                <h2 className="mb-2 font-mono text-base font-bold text-foreground">Open Source</h2>
                <p className="mb-3 max-w-[70ch] font-sans text-sm leading-relaxed text-muted-foreground">
                  LogosAI is an open-source project. Check out the source code on GitHub.
                </p>
                <a
                  href="https://github.com/IvanMiao/LogosAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-bold border-2 border-transparent hover:bg-foreground/90 transition-colors shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t-2 border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Version 1.0</span>
              <span>© 2025 LogosAI</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
