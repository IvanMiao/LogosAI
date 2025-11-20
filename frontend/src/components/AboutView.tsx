
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Brain, Code, Layers, ExternalLink } from 'lucide-react';

export function AboutView() {
  return (
    <div className="space-y-6">
      <Card className="border-border shadow-[4px_4px_0px_0px_var(--border)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-secondary border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
              <Info className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground font-mono">SYSTEM_MANIFEST</CardTitle>
              <CardDescription className="text-xs mt-0.5 font-mono">
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
              <div>
                <h3 className="text-base font-bold text-foreground mb-2 font-mono">OPERATIONAL_SCOPE</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                  Executes deep linguistic deconstruction. Isolates syntactic structures, decodes rhetorical strategies, and maps logical hierarchies. Extracts idiomatic nuances, cultural context, and authorial intent. Delivers rigorous, genre-specific analysis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-accent border-2 border-border flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_var(--border)]">
                <Layers className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground mb-3 font-mono">Tech Stack</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 font-mono">Frontend</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs border-2 border-border text-foreground font-bold bg-card hover:bg-accent hover:text-accent-foreground transition-colors">React</Badge>
                      <Badge variant="outline" className="text-xs border-2 border-border text-foreground font-bold bg-card hover:bg-accent hover:text-accent-foreground transition-colors">Vite</Badge>
                      <Badge variant="outline" className="text-xs border-2 border-border text-foreground font-bold bg-card hover:bg-accent hover:text-accent-foreground transition-colors">TailwindCSS</Badge>
                      <Badge variant="outline" className="text-xs border-2 border-border text-foreground font-bold bg-card hover:bg-accent hover:text-accent-foreground transition-colors">shadcn/ui</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 font-mono">Backend</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs border-2 border-border text-foreground font-bold bg-card hover:bg-accent hover:text-accent-foreground transition-colors">Langchain</Badge>
                      <Badge variant="outline" className="text-xs border-2 border-border text-foreground font-bold bg-card hover:bg-accent hover:text-accent-foreground transition-colors">FastAPI</Badge>
                      <Badge variant="outline" className="text-xs border-2 border-border text-foreground font-bold bg-card hover:bg-accent hover:text-accent-foreground transition-colors">SQLite</Badge>
                      <Badge variant="outline" className="text-xs border-2 border-border text-foreground font-bold bg-card hover:bg-accent hover:text-accent-foreground transition-colors">Pydantic</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-400 border-2 border-border flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_var(--border)]">
                <Code className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground mb-2 font-mono">Open Source</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3 font-mono">
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
